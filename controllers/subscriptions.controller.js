const Stripe = require('stripe');
const Business = require('../models/Business'); // adjust path if needed
const Subscription = require('../models/Subscription'); // adjust path if needed

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// helper: pick a "display" subscription from a list
function pickPreferredSubscription(list = []) {
  const preferredStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
  return list.find(s => preferredStatuses.includes(s.status)) || list[0] || null;
}

// helper: map Stripe subscription -> your SubscriptionSummary dto
function mapSub(s) {
  if (!s) return null;
  const item = s.items?.data?.[0];
  const price = item?.price;
  return {
    id: s.id,
    planId: price?.id || '',
    planName: price?.nickname || price?.product?.name || 'Subscription',
    price: (price?.unit_amount ?? 0) / 100,
    currency: (price?.currency ?? 'usd').toUpperCase(),
    interval: price?.recurring?.interval || 'month',
    intervalCount: price?.recurring?.interval_count || 1,
    status: s.status,
    currentPeriodEnd: new Date((s.current_period_end ?? 0) * 1000).toISOString(),
    cancelAtPeriodEnd: !!s.cancel_at_period_end,
  };
}

/**
 * GET /api/subscriptions/current?businessId=...
 * Returns { success, subscription: SubscriptionSummary | null }
 */
exports.getCurrentSubscriptionForBusiness = async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ success: false, message: 'businessId is required' });

    const biz = await Business.findById(businessId);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });

    // try direct by stored subscription id first
    let sub = null;
    if (biz.stripeSubscriptionId) {
      try {
        sub = await stripe.subscriptions.retrieve(biz.stripeSubscriptionId, {
          expand: ['items.data.price.product'],
        });
        // optional backfill customer if missing
        if (!biz.stripeCustomerId && sub?.customer) {
          biz.stripeCustomerId = String(sub.customer);
          await biz.save();
        }
      } catch (_) { /* fall through */ }
    }

    // otherwise list by customer
    if (!sub && biz.stripeCustomerId) {
      const list = await stripe.subscriptions.list({
        customer: biz.stripeCustomerId,
        status: 'all',
        expand: ['data.items.data.price.product'],
        limit: 10,
      });
      sub = pickPreferredSubscription(list.data);
    }

    return res.status(200).json({ success: true, subscription: mapSub(sub) });
  } catch (err) {
    console.error('getCurrentSubscriptionForBusiness error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Stripe error' });
  }
};

/**
 * POST /api/subscriptions/:id/cancel
 * body: { atPeriodEnd: boolean, businessId: string }
 */
exports.cancelSubscriptionForBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { atPeriodEnd, businessId } = req.body;
    if (!id || !businessId) return res.status(400).json({ success: false, message: 'id and businessId are required' });

    const biz = await Business.findById(businessId);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });

    const sub = await stripe.subscriptions.retrieve(id);
    if (biz.stripeCustomerId && String(sub.customer) !== biz.stripeCustomerId) {
      return res.status(403).json({ success: false, message: 'Subscription does not belong to this business' });
    }

    let updated;
    if (atPeriodEnd) {
      updated = await stripe.subscriptions.update(id, { cancel_at_period_end: true });
    } else {
      updated = await stripe.subscriptions.cancel(id);
    }

    return res.status(200).json({ success: true, subscription: mapSub(updated) });
  } catch (err) {
    console.error('cancelSubscriptionForBusiness error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Stripe error' });
  }
};

/**
 * POST /api/subscriptions/:id/resume
 * body: { businessId: string }
 * Only works if cancel_at_period_end is true and subscription still active.
 */
exports.resumeSubscriptionForBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { businessId } = req.body;
    if (!id || !businessId) return res.status(400).json({ success: false, message: 'id and businessId are required' });

    const biz = await Business.findById(businessId);
    if (!biz) return res.status(404).json({ success: false, message: 'Business not found' });

    const sub = await stripe.subscriptions.retrieve(id);
    if (biz.stripeCustomerId && String(sub.customer) !== biz.stripeCustomerId) {
      return res.status(403).json({ success: false, message: 'Subscription does not belong to this business' });
    }
    if (!sub.cancel_at_period_end) {
      return res.status(400).json({ success: false, message: 'Subscription is not set to cancel at period end' });
    }

    const updated = await stripe.subscriptions.update(id, { cancel_at_period_end: false });
    return res.status(200).json({ success: true, subscription: mapSub(updated) });
  } catch (err) {
    console.error('resumeSubscriptionForBusiness error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Stripe error' });
  }
};
