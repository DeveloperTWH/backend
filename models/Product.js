const mongoose = require('mongoose');
const slugify = require('slugify');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true,
  },

  description: {
    type: String,
    required: true,
  },

  brand: {
    type: String,
    trim: true,
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

  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },

  isPublished: {
    type: Boolean,
    default: false,
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

  coverImage: {
    type: String,
  },

  variantOptions: {
    type: [String],
    default: [],
  },

  specifications: [
    {
      key: { type: String, required: true },
      value: { type: String, required: true },
    }
  ]

}, { timestamps: true });

productSchema.pre('save', async function (next) {
  if (!this.slug && this.title) {
    let baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Product.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

productSchema.index({ businessId: 1 });
productSchema.index({ categoryId: 1, subcategoryId: 1 });


module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
