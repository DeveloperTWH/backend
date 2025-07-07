const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    default: null, // business is created after subscription
  },
  subscriptionPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true,
  },
  stripeSubscriptionId: {
    type: String,
    required: true,
  },
  stripeCustomerId: { // Optional, helps with customer lookup
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['COMPLETED', 'FAILED', 'PENDING', 'REFUNDED'],
    required: true,
  },
  payerEmail: {
    type: String,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled'],
    default: 'active',
  }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', SubscriptionSchema);
