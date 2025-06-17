const mongoose = require('mongoose');
const slugify = require('slugify');

const businessSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    businessName: {
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
      trim: true,
    },
    logo: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    website: {
      type: String,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String },
      country: { type: String, required: true },
    },
    socialLinks: {
      facebook: { type: String },
      instagram: { type: String },
      twitter: { type: String },
      linkedin: { type: String },
    },
    listingType: {
      type: String,
      enum: ['product', 'service', 'food'],
      required: true,
    },
    productCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductCategory' },
      }
    ],
    serviceCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
      }
    ],
    foodCategories: [
      {
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodCategory' },
      }
    ],
    isApproved: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    }

  },
  { timestamps: true }
);

businessSchema.pre('save', async function (next) {
  if (!this.slug && this.businessName) {
    let baseSlug = slugify(this.businessName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;

    while (await mongoose.models.Business.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    this.slug = slug;
  }
  next();
});

module.exports = mongoose.models.Business || mongoose.model('Business', businessSchema);
