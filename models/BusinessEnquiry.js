const mongoose = require('mongoose');

const businessEnquirySchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: '',
    },
    source: {
      type: String,
      trim: true,
      default: 'vendor_profile_reveal',
    },
    revealCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    lastRevealedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

businessEnquirySchema.index(
  { businessId: 1, customerId: 1, source: 1 },
  { unique: true }
);

module.exports =
  mongoose.models.BusinessEnquiry ||
  mongoose.model('BusinessEnquiry', businessEnquirySchema);
