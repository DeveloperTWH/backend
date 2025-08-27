const mongoose = require("mongoose");
const slugify = require("slugify");

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    website: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    minorityType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MinorityType",
      required: true,
    },
    phone: {
      type: String,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String },
      country: { type: String, required: true },
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
    },
    listingType: {
      type: String,
      enum: ["product", "service", "food"],
      required: true,
    },
    productCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductCategory",
      },
    ],
    serviceCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceCategory",
      },
    ],
    foodCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodCategory",
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: true,
    },
    stripeConnectAccountId: { type: String },
    chargesEnabled: { type: Boolean, default: false },
    payoutsEnabled: { type: Boolean, default: false },
    onboardingStatus: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "requirements_due"],
      default: "not_started",
    },
    onboardedAt: { type: Date },
    // optional: store capability states from Stripe
    capabilities: {
      card_payments: {
        type: String,
        enum: ["active", "pending", "inactive"],
        default: "inactive",
      },
      transfers: {
        type: String,
        enum: ["active", "pending", "inactive"],
        default: "inactive",
      },
    },
  },
  { timestamps: true }
);

businessSchema.pre("save", async function (next) {
  if (!this.slug && this.businessName) {
    let baseSlug = slugify(this.businessName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Business.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

businessSchema.index({ _id: 1, isActive: 1 });
businessSchema.index({ subscriptionId: 1 });

module.exports =
  mongoose.models.Business || mongoose.model("Business", businessSchema);
