const mongoose = require('mongoose');

const offerAttemptSchema = new mongoose.Schema({
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  success: {
    type: Boolean,
    required: true,
  },

  reason: {
    type: String,
    enum: [
      'limit_reached',
      'already_used',
      'expired',
      'first_time_user_only',
      'success',
      'invalid',
    ],
    required: true,
  },

  attemptedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.models.OfferAttempt || mongoose.model('OfferAttempt', offerAttemptSchema);
