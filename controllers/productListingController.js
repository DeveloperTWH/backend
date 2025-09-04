// controllers/productListingController.js
const { fetchEligibleProducts } = require('../services/productListingService');
const { fetchRemovalLogs } = require('../services/productListingDebugService');
const { getVendorMetaForBusinesses } = require('../lib/listing/vendorMeta');
const { baseScore, interleaveWeighted } = require('../lib/listing/ranking');
const ProductCategory = require('../models/ProductCategory');
const ProductSubcategory = require('../models/ProductSubcategory');

// tiny helper: clip a number into a safe range (with default)
const clip = (n, lo, hi, d) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return d;
  return Math.min(hi, Math.max(lo, x));
};

async function listProductsRanked(req, res) {
  try {
    const {
      categoryId,
      subcategoryId,
      excludeProductId,
      page = 1,
      pageSize = 24,
      maxPerVendor = 3,
      debug // "1" | "true"
    } = req.query;

    // Prefer locals from the middleware; fall back to query if present
    const sim = res.locals?.similar || {};
    const excludeId = sim.excludeProductId || excludeProductId;
    let catId = sim.categoryId || categoryId;
    let subId = sim.subcategoryId || subcategoryId;


    // + ADD
    const { categorySlug, subcategorySlug } = req.query;

    if (!catId && categorySlug) {
      const cat = await ProductCategory.findOne({ slug: categorySlug }, { _id: 1 }).lean();
      if (!cat) return res.status(404).json({ error: 'Unknown category slug' });
      catId = String(cat._id);
    }

    if (!subId && subcategorySlug) {
      // scope to category if available (helps correctness even if sub slugs are globally unique)
      const subFilter = catId ? { slug: subcategorySlug, category: catId } : { slug: subcategorySlug };
      const sub = await ProductSubcategory.findOne(subFilter, { _id: 1, category: 1 }).lean();
      if (!sub) return res.status(404).json({ error: 'Unknown subcategory slug' });
      subId = String(sub._id);
      // if category wasn’t provided but sub was found, you may also backfill catId:
      if (!catId && sub.category) catId = String(sub.category);
    }


    const wantDebug = debug === '1' || debug === 'true';
    const pageNum = clip(page, 1, 100000, 1);
    const pageSizeN = clip(pageSize, 1, 60, 24);     // hard cap pageSize
    const cap = clip(maxPerVendor, 0, 50, 3);  // 0 disables cap
    const enforceCap = cap > 0;

    const t0 = Date.now();

    // Bound upstream work: enough headroom for interleave + cap + backfill
    const fetchLimit = Math.max(50, pageSizeN * 10);

    // Fetch eligible + (optional) debug removals in parallel
    const [products, removedAtAggregation] = await Promise.all([
      fetchEligibleProducts({ categoryId: catId, subcategoryId: subId, excludeProductId: excludeId, fetchLimit }),
      wantDebug ? fetchRemovalLogs({ categoryId: catId, subcategoryId: subId }) : Promise.resolve([])
    ]);

    if (!products.length) {
      const payload = {
        items: [],
        total: 0,
        page: pageNum,
        pageSize: pageSizeN,
        mix: {}
      };
      if (wantDebug) payload.debug = { removedAtAggregation, removedByCap: [], notOnPage: [], timings: { totalMs: Date.now() - t0 } };
      return res.json(payload);
    }

    // Vendor meta + plan weights
    const bizIds = [...new Set(products.map(p => String(p.businessId)))];
    const { vendorByBizId, weightByPlanId } = await getVendorMetaForBusinesses(bizIds);

    // Score & bucket by plan
    const byPlan = {};
    const now = Date.now();
    for (const p of products) {
      const vendor = vendorByBizId.get(String(p.businessId));
      const planId = vendor?.planId || String(p.planId || 'UNKNOWN');
      const score = baseScore(p, vendor, now);
      (byPlan[planId] ||= []).push({ ...p, __score: score, planId, biz: { businessName: p.businessName } });
    }

    for (const k of Object.keys(byPlan)) {
      byPlan[k].sort((a, b) => {
        if (b.__score !== a.__score) return b.__score - a.__score;
        const t = +new Date(b.createdAt) - +new Date(a.createdAt);
        if (t !== 0) return t;
        return String(a._id).localeCompare(String(b._id));
      });
    }

    // Interleave plan buckets by weight (falls back to equal if no weights)
    const interleaved = interleaveWeighted(byPlan, weightByPlanId);
    const tAfterInterleave = Date.now();

    // Per-vendor cap (soft-cap: overflow saved for backfill)
    const perVendorCount = new Map();
    const capped = [];
    const removedByCap = [];
    const overflow = [];

    for (const p of interleaved) {
      const biz = String(p.businessId);
      const c = (perVendorCount.get(biz) ?? 0) + 1;

      if (enforceCap && c > cap) {
        if (wantDebug) {
          removedByCap.push({
            productId: p._id,
            businessId: p.businessId,
            reason: 'per_vendor_cap',
            businessName: p.biz?.businessName,
            planId: p.planId
          });
        }
        overflow.push(p);
        continue;
      }
      perVendorCount.set(biz, c);
      capped.push(p);
    }

    // --- SOFT-CAP BACKFILL ---
    const start = (pageNum - 1) * pageSizeN;
    const end = start + pageSizeN;

    if (capped.length < end && overflow.length > 0) {
      const need = end - capped.length;
      const refill = overflow.slice(0, need);

      const refilledIds = new Set(refill.map(x => String(x._id)));
      refill.forEach(x => { x.__capRelaxed = true; });

      // Remove refilled from removedByCap
      for (let i = removedByCap.length - 1; i >= 0; i--) {
        if (refilledIds.has(String(removedByCap[i].productId))) removedByCap.splice(i, 1);
      }
      capped.push(...refill);
    }

    // Paginate after refill
    const pageItems = capped.slice(start, Math.min(end, capped.length));

    // Debug: which valid items aren’t on this page
    const notOnPage = wantDebug
      ? capped
        .map((p, idx) => ({ p, idx }))
        .filter(({ idx }) => idx < start || idx >= Math.min(end, capped.length))
        .map(({ p }) => ({
          productId: p._id,
          businessId: p.businessId,
          reason: 'page_excluded',
          planId: p.planId,
          capRelaxed: !!p.__capRelaxed
        }))
      : [];

    // Mix telemetry (count per planId on this page)
    const mix = {};
    for (const it of pageItems) {
      const pid = String(it.planId || 'UNKNOWN');
      mix[pid] = (mix[pid] ?? 0) + 1;
    }

    const payload = {
      items: pageItems,
      total: capped.length,
      page: pageNum,
      pageSize: pageSizeN,
      mix
    };

    if (wantDebug) {
      payload.debug = {
        removedAtAggregation,
        removedByCap,
        notOnPage,
        timings: {
          totalMs: Date.now() - t0,
          interleaveMs: tAfterInterleave - t0
        }
      };
      // optional: prevent CDN caching of debug payloads
      res.set('Cache-Control', 'no-store');
    }

    return res.json(payload);
  } catch (err) {
    console.error('listProductsRanked error:', { msg: err?.message, stack: err?.stack });
    return res.status(500).json({ error: 'Failed to fetch ranked products' });
  }
}

module.exports = { listProductsRanked };
