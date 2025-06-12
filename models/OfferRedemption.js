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

  usedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.models.OfferRedemption || mongoose.model('OfferRedemption', offerRedemptionSchema);
