const mongoose = require('mongoose');

const offerRedemptionSchema = new mongoose.Schema({
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

  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order', // Optional: link redemption to a specific order
  },

  usedAt: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.models.OfferRedemption || mongoose.model('OfferRedemption', offerRedemptionSchema);
