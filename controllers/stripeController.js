const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const BusinessDraft = require("../models/BusinessDraft");
const SubscriptionPlan = require("../models/SubscriptionPlan");
const Subscription = require("../models/Subscription");
const Business = require("../models/Business");
const { sendWelcomeEmail } = require("../utils/WellcomeMailer");

exports.createCheckoutSession = async (req, res) => {
  try {
    const { draftId } = req.body;

    // ✅ 1. Find draft
    const draft = await BusinessDraft.findById(draftId);
    if (!draft) {
      return res
        .status(404)
        .json({ message: "Business draft not found or expired." });
    }

    // ✅ 2. Validate Stripe Price ID
    const priceMap = {
      "686cf1174000a9f8efd5842c": "price_1RiBujCe8NK5w7I0HICqEpOw",
      "685281f61e1de765d6b297c0": "price_1RiBujCe8NK5w7I0nKgWkLhu",
      "686cf2144000a9f8efd58433": "price_1RiBujCe8NK5w7I0nGiysSCh",
    };
    const stripePriceId = priceMap[draft.subscriptionPlanId.toString()];

    if (!stripePriceId) {
      return res
        .status(400)
        .json({ message: "Invalid subscription plan selected" });
    }

    // ✅ 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: draft.email,
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: "https://app.minorityownedbusiness.info/partners",
      cancel_url: "https://app.minorityownedbusiness.info/partners",
      metadata: {
        draftId: draft._id.toString(),
        ownerId: draft.owner.toString(),
      },
    });

    res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error("Stripe session creation failed:", error);
    res.status(500).json({ message: "Failed to create checkout session" });
  }
};

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful checkout session completion
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { draftId, ownerId } = session.metadata;
    const stripeSubscriptionId = session.subscription;
    const stripeCustomerId = session.customer;

    console.log(
      `Processing checkout.session.completed for Draft ID: ${draftId}`
    );

    let newSubscription;
    let business;

    try {
      // Check if this subscription is already linked to a business
      const existingSubscription = await Subscription.findOne({
        stripeSubscriptionId,
      });
      if (existingSubscription && existingSubscription.businessId) {
        console.error("This subscription is already linked to a business.");
        return res
          .status(400)
          .send("This subscription is already linked to a business.");
      }

      // Find the draft
      const draft = await BusinessDraft.findById(draftId);
      if (!draft) {
        console.error(`Draft ${draftId} not found (possibly expired)`);
        return res.status(404).send("Draft not found");
      }

      console.log("Draft found:", draft);

      // Set subscription start and end dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 1); // 1-year duration

      // Create the subscription first
      newSubscription = await Subscription.create({
        userId: ownerId,
        businessId: null, // This will be updated later
        subscriptionPlanId: draft.subscriptionPlanId,
        stripeSubscriptionId,
        stripeCustomerId,
        payerEmail: draft.email,
        paymentStatus: "COMPLETED",
        startDate,
        endDate,
        status: "active",
      });

      console.log("New Subscription created:", newSubscription);

      // Check for business name conflict
      let businessName = draft.businessName;
      let existingBusiness = await Business.findOne({
        businessName: { $regex: new RegExp(`^${businessName}$`, "i") },
      });

      let counter = 1;
      while (existingBusiness) {
        businessName = `${draft.businessName}-${counter}`;
        existingBusiness = await Business.findOne({
          businessName: { $regex: new RegExp(`^${businessName}$`, "i") },
        });
        counter++;
      }

      // Create the business
      business = new Business({
        owner: ownerId,
        businessName,
        email: draft.email,
        description: draft.formData.description,
        phone: draft.formData.phoneNumber,
        listingType: draft.formData.listingType,
        address: {
          street: draft.formData.address || "",
          city: draft.formData.city || "",
          state: draft.formData.state || "",
          country: draft.formData.country || "",
        },
        socialLinks: draft.formData.socialLinks || {},
        productCategories: draft.formData.productCategories || [],
        serviceCategories: draft.formData.serviceCategories || [],
        foodCategories: draft.formData.foodCategories || [],
        logo: draft.formData.logo || "",
        coverImage: draft.formData.coverImage || "",
        minorityType: draft.minorityType, // Use minorityType from the draft
        isApproved: false, // Not active until admin approval
        isActive: false, // Mark as inactive until admin approval
        subscriptionId: newSubscription._id,
        stripeSubscriptionId,
      });

      // Save the business
      await business.save();

      console.log("Business created:", business);

      // Update subscription with business ID
      newSubscription.businessId = business._id;
      await newSubscription.save();

      // Delete the draft
      await draft.deleteOne();

      console.log(`Business ${business.businessName} created from draft`);

      // Respond with success message
      const responseMessage =
        businessName !== draft.businessName
          ? `Business name was already in use, so we have assigned you a new name: ${business.businessName}. You can change it later.`
          : `Business created successfully.`;

      sendWelcomeEmail(business.email, businessName )
      return res.status(200).json({
        message: responseMessage,
        business,
      });
    } catch (error) {
      console.error("Error creating business from draft:", error);

      // Handle rollback if necessary
      if (newSubscription) {
        newSubscription.businessId = null;
        await newSubscription.save(); // Save the updated subscription with businessId as null
      }
      if (business) {
        await business.deleteOne(); // Ensure that the business is removed if an error occurs
      }

      if (!res.headersSent) {
        return res.status(500).send("Webhook processing failed");
      }
    }
  }

  return res.status(400).send(`Unhandled event type: ${event.type}`);
};
