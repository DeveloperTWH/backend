// lib/listing/vendorMeta.js
const SubscriptionPlan = require('../../models/SubscriptionPlan');
const Subscription = require('../../models/Subscription');

// ---- Config ----
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutes
const MIN_WEIGHT_EPS    = 0.01;           // avoid true zero weights
const MAX_IDS_PER_CHUNK = 1000;           // defensive chunking for $in queries
const MAX_BUSINESS_IDS  = 20000;          // guard upper bound

let _planCache = { at: 0, data: null };

/**
 * Build plan meta: highest price → highest priority; weight normalized by max price.
 * Returns Map<planId, { priority, weight, name, price }>
 */
async function buildPlanMeta() {
  const plans = await SubscriptionPlan
    .find({}, { _id: 1, name: 1, price: 1 })
    .lean();

  if (!plans?.length) return new Map();

  // Sort by price desc. If prices tie, keep insertion order.
  plans.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));

  const maxPrice = Math.max(1, ...plans.map(p => Number(p.price || 0))); // fallback 1 avoids /0
  const byId = new Map();

  plans.forEach((p, idx) => {
    const price    = Number(p.price || 0);
    const priority = plans.length - idx; // 3,2,1 … (more expensive => larger)
    const weight   = Math.max(MIN_WEIGHT_EPS, price / maxPrice);

    byId.set(String(p._id), {
      priority,
      weight,
      name: p.name,
      price
    });
  });

  return byId;
}

/**
 * Cached wrapper for plan meta (reduces DB load under traffic)
 */
async function getPlanMetaCached() {
  const now = Date.now();
  if (_planCache.data && (now - _planCache.at) < PLAN_CACHE_TTL_MS) {
    return _planCache.data;
  }
  const fresh = await buildPlanMeta();
  _planCache = { at: now, data: fresh };
  return fresh;
}

/**
 * Return vendor & plan exposure info for the given businesses.
 * - vendorByBizId: Map<businessId, { planId, planName, planPrice, priority, weight }>
 * - weightByPlanId: { [planId]: weight }
 */
async function getVendorMetaForBusinesses(businessIds) {
  // Defensive: dedupe, trim, stringify
  const ids = Array.from(new Set((businessIds || []).map(String))).slice(0, MAX_BUSINESS_IDS);
  const vendorByBizId = new Map();

  // If nothing to do, still return weight map (used by interleaver)
  const planMeta = await getPlanMetaCached();
  const weightByPlanId = {};
  for (const [pid, meta] of planMeta.entries()) weightByPlanId[pid] = meta.weight;

  if (ids.length === 0 || planMeta.size === 0) {
    // No businesses or no plans configured → let interleaver fall back to equal weights
    return { vendorByBizId, weightByPlanId };
  }

  // Chunk $in to keep queries safe for large arrays
  const chunks = [];
  for (let i = 0; i < ids.length; i += MAX_IDS_PER_CHUNK) {
    chunks.push(ids.slice(i, i + MAX_IDS_PER_CHUNK));
  }

  for (const chunk of chunks) {
    const subs = await Subscription
      .find(
        { businessId: { $in: chunk }, status: 'active' },
        { businessId: 1, subscriptionPlanId: 1 }
      )
      .lean();

    for (const s of subs) {
      const planId = String(s.subscriptionPlanId);
      const meta = planMeta.get(planId);
      if (!meta) continue;

      vendorByBizId.set(String(s.businessId), {
        planId,
        planName:  meta.name,
        planPrice: meta.price,
        priority:  meta.priority,
        weight:    meta.weight,
      });
    }
  }

  return { vendorByBizId, weightByPlanId };
}

module.exports = {
  buildPlanMeta,            // exported for tests/ops tooling if you need it
  getVendorMetaForBusinesses,
  // optional export if you want to warm/clear plan cache externally:
  _internal: { getPlanMetaCached: getPlanMetaCached }
};
