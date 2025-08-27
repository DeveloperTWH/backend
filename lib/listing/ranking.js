// lib/listing/ranking.js

/**
 * Compute a lightweight score for tie-breaking within the same plan.
 * Subscription priority dominates; rating & recency are small nudges.
 */
function baseScore(p, vendorMeta, now = Date.now()) {
  const sub = vendorMeta?.priority ?? 0;

  const ratingAvg = Number(p?.variantRatingAvg ?? 0) || 0;
  const ratingCnt = Number(p?.variantRatingCount ?? 0) || 0;
  const rating = ratingAvg * Math.log10(1 + ratingCnt);

  // Guard against bad/undefined dates
  const createdMs = p?.createdAt ? new Date(p.createdAt).getTime() : NaN;
  const ageDaysRaw = Number.isFinite(createdMs)
    ? Math.max(1, (now - createdMs) / 86400000)
    : 30; // default age if date is missing
  const recency = 1 / Math.log2(2 + ageDaysRaw);

  return 1.0 * sub + 0.2 * rating + 0.1 * recency;
}

/**
 * Interleave pre-sorted groups using a deficit-round-robin (weighted fair queuing) approach.
 * - `groups`: { [groupKey]: Array<T> }  (arrays should already be sorted: best first)
 * - `weights`: { [groupKey]: number }   (relative exposure; higher => more frequent picks)
 * - `limit`: optional hard cap on total items emitted
 *
 * Production guards:
 *  - Clamp tiny weights to a small epsilon to prevent "no progress" rounds.
 *  - Keep accumulating credits across rounds even if no item emitted yet.
 *  - Max-steps safety break to avoid pathological loops.
 */
function interleaveWeighted(groups, weights, limit) {
  const keys = Object.keys(groups).filter(k => Array.isArray(groups[k]) && groups[k].length > 0);
  if (keys.length === 0) return [];

  const remaining = new Map(keys.map(k => [k, [...groups[k]]]));
  const credit = new Map(keys.map(k => [k, 0]));
  const out = [];

  // Normalize weights; if all zero/undefined, fall back to equal weights.
  const W = {};
  let allZero = true;
  for (const k of keys) {
    const w = Number(weights?.[k] ?? 0);
    if (w > 0) allZero = false;
    W[k] = w;
  }
  if (allZero) {
    for (const k of keys) W[k] = 1;
  } else {
    // Clamp to avoid excessively tiny weights that would require huge rounds to accumulate.
    const EPS = 0.01; // matches plan-meta min we often use; tune if needed
    for (const k of keys) W[k] = Math.max(EPS, W[k]);
  }

  // Helper to know when we’re done
  const totalRemaining = () =>
    Array.from(remaining.values()).reduce((acc, arr) => acc + (arr?.length || 0), 0);

  // Safety: avoid infinite loops (should never hit in practice)
  const maxSteps = 100000 + totalRemaining(); // generous
  let steps = 0;

  while ((limit ? out.length < limit : true) && totalRemaining() > 0 && steps < maxSteps) {
    steps++;

    let emittedThisRound = false;

    for (const k of keys) {
      const list = remaining.get(k);
      if (!list || list.length === 0) continue;

      credit.set(k, (credit.get(k) ?? 0) + W[k]);

      while ((credit.get(k) ?? 0) >= 1 && list.length > 0) {
        out.push(list.shift());
        credit.set(k, (credit.get(k) ?? 0) - 1);
        emittedThisRound = true;
        if (limit && out.length >= limit) return out;
      }
    }

    // If we didn’t emit in this pass, DO NOT break; credits will continue to accumulate
    // and eventually cross the >=1 threshold in subsequent rounds.
    // (We still rely on maxSteps as a final safety.)
  }

  return out;
}

module.exports = { baseScore, interleaveWeighted };
