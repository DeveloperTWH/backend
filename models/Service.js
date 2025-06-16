const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
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
  isPublished: {
    type: Boolean,
    default: false,
  },
  images: {
    type: [String], // Array of image URLs
    required: true,
    validate: {
      validator: function (val) {
        return val.length > 0;
      },
      message: 'At least one image is required.',
    },
  },
  videos: {
    type: [String], // Array of video URLs (optional)
    default: [],
  },
  availableSlots: [
    {
      date: { type: Date, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
    },
  ],
  features: {
    type: [String], // Array of service features
    required: true,
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
  locationMapEmbedUrl: {
    type: String,
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

// Method to calculate total reviews and average rating
serviceSchema.methods.calculateRatings = async function () {
  const reviews = await mongoose.model('Review').find({ listingId: this._id, listingType: 'service' });
  this.totalReviews = reviews.length;

  const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0);
  this.averageRating = totalRating / this.totalReviews;

  await this.save();
};

module.exports = mongoose.model('Service', serviceSchema);
