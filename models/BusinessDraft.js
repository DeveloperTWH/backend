const mongoose = require('mongoose');

const BusinessDraftSchema = new mongoose.Schema({
  businessName: { type: String, required: true, unique: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  formData: { type: mongoose.Schema.Types.Mixed },  // Save other form fields here (address, phone, etc.)
  subscriptionPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired drafts (15 min TTL)
BusinessDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BusinessDraft', BusinessDraftSchema);
