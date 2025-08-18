// models/SubscriptionPlan.js
const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Basic, Pro, Premium, etc.
  },
  price: {
    type: Number,
    required: true,
  },
  currency: { type: String, default: 'usd' },
  interval: { type: String, enum: ['day', 'week', 'month', 'year'], default: 'year' }, // <- NEW
  intervalCount: { type: Number, default: 1 },                        // <- NEW
  trialPeriodDays: { type: Number, default: 0 },                      // <- NEW

  durationInDays: {
    type: Number,
    default: 365, // Annual by default
  },

  stripeProductId: { type: String },                                  // <- NEW
  stripePriceId: { type: String, unique: true, sparse: true },      // <- NEW
  
  limits: {
    productListings: { type: Number, default: 1 },
    serviceListings: { type: Number, default: 1 },
    foodListings: { type: Number, default: 1 },
    imageLimit: { type: Number, default: 3 },
    videoLimit: { type: Number, default: 0 },
  },
  features: {
    analyticsDashboard: { type: Boolean, default: false },
    marketingTools: { type: Boolean, default: false },
    featuredPlacement: { type: Boolean, default: false },
    supportLevel: { type: String, enum: ['none', 'community', 'email', 'priority'], default: 'none' },
    communityEventsAccess: { type: Boolean, default: false },
    searchPriority: { type: Boolean, default: false },
    listingPriority: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: false },
    aiRecommendation: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
