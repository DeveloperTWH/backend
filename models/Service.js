const mongoose = require('mongoose');
const slugify = require('slugify');

const serviceSchema = new mongoose.Schema({
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
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  duration: {
    type: String, // Example: '1 hour', '30 minutes'
    required: true,
  },
  services: [
    {
      name: { type: String, required: true },
    },
  ],
  categories: [
    {
      categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        required: true,
      },
      subcategoryIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ServiceSubcategory',
          required: true,
        },
      ],
    },
  ],
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  minorityType: {
    type: String,
    trim: true,
    required: true,
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  coverImage: {
    type: String,
    required: true,
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return val.length > 0;
      },
      message: 'At least one image is required.',
    },
  },
  maxBookingsPerSlot: {
    type: Number,
    default: 1, // Default = only one person can book per slot
  },
  videos: {
    type: [String],
    default: [],
  },
  features: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return val.length > 0;
      },
      message: 'At least one feature is required.',
    },
  },
  amenities: [
    {
      label: { type: String, required: true },
      available: { type: Boolean, required: true },
    },
  ],
  businessHours: [
    {
      day: { type: String, required: true },
      hours: { type: String, required: true },
    },
  ],
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  contact: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    website: { type: String },
  },
  faq: [
    {
      question: { type: String, required: true },
      answer: { type: String, required: true },
    },
  ],
  totalReviews: {
    type: Number,
    default: 0,
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
}, { timestamps: true });

// Generate slug before save
serviceSchema.pre('save', async function (next) {
  if (!this.isModified('title')) return next();

  const baseSlug = slugify(this.title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // Use mongoose.models to avoid circular reference
  const ServiceModel = mongoose.models.Service || this.constructor;

  while (await ServiceModel.exists({ slug })) {
    slug = `${baseSlug}-${counter++}`;
  }

  this.slug = slug;
  next();
});


// Method to calculate total reviews and average rating
serviceSchema.methods.calculateRatings = async function () {
  const reviews = await mongoose.model('Review').find({
    listingId: this._id,
    listingType: 'service',
  });
  this.totalReviews = reviews.length;

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  this.averageRating = this.totalReviews > 0
    ? Math.round((totalRating / this.totalReviews) * 10) / 10
    : 0;

  await this.save();
};

// Indexes for faster queries
serviceSchema.index({ ownerId: 1 });
serviceSchema.index({ location: '2dsphere' });
serviceSchema.index({ 'categories.categoryId': 1 });

module.exports = mongoose.model('Service', serviceSchema);
