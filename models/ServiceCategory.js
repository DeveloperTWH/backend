const mongoose = require('mongoose');
const slugify = require('slugify');

const serviceCategorySchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

// ✅ Pre-save hook to auto-generate slug
serviceCategorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  const CategoryModel = mongoose.models.ServiceCategory || this.constructor;

  while (await CategoryModel.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

module.exports =
  mongoose.models.ServiceCategory ||
  mongoose.model('ServiceCategory', serviceCategorySchema);
