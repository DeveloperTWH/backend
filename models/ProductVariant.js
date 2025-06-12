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
  },

  size: {
    type: String,
    required: true,
    trim: true,
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
        return val.length > 0;
      },
      message: 'At least one image is required.',
    },
  },

  videos: {
    type: [String],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);
