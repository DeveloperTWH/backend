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

  currentUsage: {
    type: Number,
    default: 0,
  },

  usageLimit: {
    type: Number,
    default: null, // null means unlimited
  },

  usagePerUser: {
    type: Number,
    default: 1,
  },

  isFirstTimeUserOnly: {
    type: Boolean,
    default: false,
  },

  termsAndConditions: {
    type: String,
    default: '',
  }
}, { timestamps: true });

module.exports = mongoose.models.Offer || mongoose.model('Offer', offerSchema);
