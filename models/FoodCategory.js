const mongoose = require('mongoose');

const foodCategorySchema = new mongoose.Schema(
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
  mongoose.models.FoodCategory || mongoose.model('FoodCategory', foodCategorySchema);
