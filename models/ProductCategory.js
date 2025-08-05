const mongoose = require('mongoose');
const slugify = require('slugify');

const productCategorySchema = new mongoose.Schema(
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
    img: {
      type: String, // S3 URL
      trim: true,
    },
  },
  { timestamps: true }
);

// Auto-generate unique slug from name
productCategorySchema.pre('save', async function (next) {
  if (!this.isModified('name')) return next();

  const baseSlug = slugify(this.name, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  const CategoryModel = mongoose.models.ProductCategory || this.constructor;

  while (await CategoryModel.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});

module.exports =
  mongoose.models.ProductCategory ||
  mongoose.model('ProductCategory', productCategorySchema);
