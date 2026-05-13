const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true,
  },

  name: {
    type: String,
    required: true, // e.g. "Diwali Offer"
  },

  couponCode: {
    type: String,
    required: true,
    uppercase: true,
    unique: true,
  },

  type: {
    type: String,
    enum: ["percentage", "fixed"],
    required: true,
  },

  value: {
    type: Number,
    required: true,
  },

  minOrderAmount: {
    type: Number,
    default: 0,
  },

  maxDiscountAmount: {
    type: Number, // useful for % type
  },

  usageLimit: {
    type: Number, // total usage
  },

  usedCount: {
    type: Number,
    default: 0,
  },

  validFrom: {
    type: Date,
    default: Date.now,
  },

  validTill: {
    type: Date,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

}, { timestamps: true });

module.exports = mongoose.model("Discount", discountSchema);