const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const BusinessDraft = require('../models/BusinessDraft');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Subscription = require('../models/Subscription');
const Business = require('../models/Business');

exports.createCheckoutSession = async (req, res) => {
  try {
    const { draftId } = req.body;

    // ✅ 1. Find draft
    const draft = await BusinessDraft.findById(draftId);
    if (!draft) {
      return res.status(404).json({ message: 'Business draft not found or expired.' });
    }

    // ✅ 2. Validate Stripe Price ID
    const priceMap = {
      '685281f61e1de765d6b297c0': 'price_1RiBujCe8NK5w7I0HICqEpOw',
      '685281f61e1de765d6b297c01': 'price_1RiBujCe8NK5w7I0nKgWkLhu',
      '685281f61e1de765d6b297c02': 'price_1RiBujCe8NK5w7I0nGiysSCh',
    };
    const stripePriceId = priceMap[draft.subscriptionPlanId.toString()];

    if (!stripePriceId) {
      return res.status(400).json({ message: 'Invalid subscription plan selected' });
    }

    // ✅ 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: draft.email,
      line_items: [
        { price: stripePriceId, quantity: 1 },
      ],
      success_url: 'http://localhost:3000/partners',
      cancel_url: 'http://localhost:3000/partners',
      metadata: {
        draftId: draft._id.toString(),
        ownerId: draft.owner.toString(),
      },
    });

    res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Stripe session creation failed:', error);
    res.status(500).json({ message: 'Failed to create checkout session' });
  }
};




const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const draftId = session.metadata.draftId;
    const ownerId = session.metadata.ownerId;
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;
    console.log("Processing checkout.session.completed for Draft ID:", draftId);

    try {
      // Find the draft
      const draft = await BusinessDraft.findById(draftId);
      if (!draft) {
        console.error(`Draft ${draftId} not found (possibly expired)`);
        return res.status(404).send('Draft not found');
      }

      console.log('Draft found:', draft);

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1); // 1 year duration

      // Create subscription
      const newSubscription = await Subscription.create({
        userId: ownerId,
        businessId: null, // will be updated later
        subscriptionPlanId: draft.subscriptionPlanId,
        stripeSubscriptionId,
        stripeCustomerId,
        payerEmail: draft.email,
        paymentStatus: 'COMPLETED',
        startDate,
        endDate,
        status: 'active',
      });

      console.log('New Subscription created:', newSubscription);

      // Create the business
      const business = await Business.create({
        owner: ownerId,
        businessName: draft.businessName,
        email: draft.email,
        ...draft.formData, // Ensure this matches your Business schema fields
        isActive: false, // Not active until admin approval
        isApproved: false, // Pending admin approval
        subscriptionId: newSubscription._id,
        stripeSubscriptionId,
      });

      console.log('Business created:', business);

      // Update subscription with business ID
      newSubscription.businessId = business._id;
      await newSubscription.save();

      // Delete the draft
      await draft.deleteOne();

      console.log(`Business ${business.businessName} created from draft`);

    } catch (error) {
      console.error('Error creating business from draft:', error);
      return res.status(500).send('Webhook processing failed');
    }
  }

  // Acknowledge receipt of the event
  res.status(200).json({ received: true });
};
