const mongoose = require('mongoose');

const serviceSubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.ServiceSubcategory ||
  mongoose.model('ServiceSubcategory', serviceSubcategorySchema);
