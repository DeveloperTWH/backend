const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  discountType: {
    type: String,
    enum: ['percentage', 'flat'],
    required: true,
  },

  discountValue: {
    type: Number,
    required: true,
  },

  applyToAllProducts: {
    type: Boolean,
    default: false,
  },

  productIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Product',
    default: [],
  },

  validFrom: {
    type: Date,
    required: true,
  },

  validTill: {
    type: Date,
    required: true,
  },

  termsAndConditions: {
    type: String,
    default: '',
  },

  usageLimit: {
    type: Number, // total allowed uses across all users
    default: null, // unlimited
  },

  usagePerUser: {
    type: Number, // times a single user can redeem
    default: 1,
  },

  isFirstTimeUserOnly: {
    type: Boolean,
    default: false,
  }

}, { timestamps: true });

module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
