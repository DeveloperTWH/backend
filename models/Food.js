const mongoose = require('mongoose');
const slugify = require('slugify');

const foodSchema = new mongoose.Schema(
  {
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
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (val) => val.length > 0,
        message: 'At least one image is required.',
      },
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodCategory',
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
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
    foodType: {
      type: String,
      enum: ['shop', 'farm', 'restaurant'],
      required: true,
    },
    brand: {
      type: String, // Optional: used only for Shop foods
    },
    tableTypes: [
      {
        type: {
          type: String, // e.g., '2-Seater'
          required: true,
        },
        count: {
          type: Number,
          required: true,
          min: 1,
        },
      },
    ],
    bookingTimeSlots: {
      type: [String], // e.g., ['12:00 PM', '1:00 PM', ...]
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
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
  },
  { timestamps: true }
);

// Auto-generate slug
foodSchema.pre('save', async function (next) {
  if (!this.slug) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await mongoose.models.Food.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    this.slug = slug;
  }
  next();
});

// Index for location-based search
foodSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Food', foodSchema);
