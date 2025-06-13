const mongoose = require('mongoose');

const productCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ProductCategory ||
  mongoose.model('ProductCategory', productCategorySchema);
