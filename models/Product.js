const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
  },

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductCategory',
    required: true,
  },

  subcategoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductSubcategory',
    required: true,
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  isPublished: {
    type: Boolean,
    default: false,
  },

  variantOptions: {
    color: {
      type: [String],
      default: [],
    },
    size: {
      type: [String],
      default: [],
    },
  },

  specifications: [
    {
      key: { type: String, required: true },
      value: { type: String, required: true },
    }
  ],

  averageRating: {
    type: Number,
    default: 0,
  },

  totalReviews: {
    type: Number,
    default: 0,
  }

}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
