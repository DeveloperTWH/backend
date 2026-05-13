const mongoose = require('mongoose');

const categoryRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    categoryType: {
      type: String,
      enum: ['product', 'service', 'food'],
      default: 'product',
      trim: true,
    },
    categoryName: {
      type: String,
      required: true,
      trim: true,
    },
    subcategoryName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    approvedCategoryModel: {
      type: String,
      enum: ['ProductCategory', 'ServiceCategory', 'FoodCategory'],
    },
    approvedCategory: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'approvedCategoryModel',
    },
    approvedSubcategoryModel: {
      type: String,
      enum: ['ProductSubcategory', 'ServiceSubcategory', 'FoodSubcategory'],
    },
    approvedSubcategory: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'approvedSubcategoryModel',
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.CategoryRequest ||
  mongoose.model('CategoryRequest', categoryRequestSchema);
