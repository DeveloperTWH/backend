const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    website: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
    },
    listingType: {
      type: String,
      enum: ['product', 'service', 'food'],
      required: true,
    },
    productCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
      }
    ],
    serviceCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
      }
    ],
    foodCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCategory' },
      }
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Business || mongoose.model('Business', businessSchema);
