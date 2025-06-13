const mongoose = require('mongoose');

const foodSubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodCategory',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.FoodSubcategory || mongoose.model('FoodSubcategory', foodSubcategorySchema);
