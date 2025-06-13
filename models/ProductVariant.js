const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  color: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  size: {
    type: String,
    required: true,
    trim: true,
    uppercase: true, 
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  stock: {
    type: Number,
    required: true,
    min: 0,
  },

  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length > 0;
      },
      message: 'At least one image is required.',
    },
  },

  videos: {
    type: [String],
    default: [],
  },

}, { timestamps: true });

module.exports = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);
