const mongoose = require('mongoose');
const slugify = require('slugify');

const foodSubcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      unique: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodCategory',
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-generate slug from name
foodSubcategorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  const SubModel = mongoose.models.FoodSubcategory || this.constructor;

  while (await SubModel.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

module.exports =
  mongoose.models.FoodSubcategory || mongoose.model('FoodSubcategory', foodSubcategorySchema);
