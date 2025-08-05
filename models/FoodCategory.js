const mongoose = require('mongoose');
const slugify = require('slugify');

const foodCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// ✅ Auto-generate slug from name
foodCategorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  const Model = mongoose.models.FoodCategory || this.constructor;

  while (await Model.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

module.exports =
  mongoose.models.FoodCategory || mongoose.model('FoodCategory', foodCategorySchema);
