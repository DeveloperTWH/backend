const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Ensures the plan has a Stripe product & recurring price.
 * Creates them on Stripe if missing, saves to Mongo, and returns { productId, priceId }.
 */
async function ensurePlanPrice(plan) {
  // Reuse a stored price only if it still exists in the current Stripe account.
  if (plan.stripePriceId) {
    try {
      const existingPrice = await stripe.prices.retrieve(plan.stripePriceId);
      if (!existingPrice.deleted) {
        plan.stripeProductId = existingPrice.product;
        if (plan.isModified('stripeProductId')) {
          await plan.save();
        }

        return { productId: plan.stripeProductId, priceId: plan.stripePriceId };
      }
    } catch (error) {
      if (error.code !== 'resource_missing') {
        throw error;
      }

      // The saved Stripe IDs are stale for this account; clear them and recreate below.
      plan.stripePriceId = undefined;
    }
  }

  // Create/reuse Product
  let productId = plan.stripeProductId;
  if (productId) {
    try {
      await stripe.products.retrieve(productId);
    } catch (error) {
      if (error.code !== 'resource_missing') {
        throw error;
      }

      productId = undefined;
      plan.stripeProductId = undefined;
    }
  }

  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { planId: String(plan._id), planName: plan.name },
    });
    productId = product.id;
    plan.stripeProductId = productId;
  }

  // Create recurring Price
  const price = await stripe.prices.create({
    unit_amount: Math.round(plan.price * 100),      // cents
    currency: (plan.currency || 'usd').toLowerCase(),
    recurring: {
      interval: plan.interval || 'year',
      interval_count: plan.intervalCount || 1,
      ...(plan.trialPeriodDays > 0 ? { trial_period_days: plan.trialPeriodDays } : {}),
    },
    product: productId,
    nickname: plan.name,
    metadata: { planId: String(plan._id) },
  });

  plan.stripePriceId = price.id;
  await plan.save();

  return { productId, priceId: price.id };
}

module.exports = { ensurePlanPrice };
