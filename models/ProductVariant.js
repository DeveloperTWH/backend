const mongoose = require('mongoose');

const productVariantSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
  },

  color: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  sizes: [
    {
      size: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },
      stock: {
        type: Number,
        required: true,
        min: 0,
      },
      price: {
        type: mongoose.Schema.Types.Decimal128,
        required: true,
        min: 0,
      },
      salePrice: {
        type: mongoose.Schema.Types.Decimal128,
        min: 0,
        validate: {
          validator: function (v) {
            return !v || v < this.price;
          },
          message: 'Sale price must be less than original price',
        },
      },
      discountEndDate: {
        type: Date,
      },
      sku: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      }
    }
  ],

  isPublished: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },

  weightInKg: mongoose.Schema.Types.Decimal128,

  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },

  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length > 0;
      },
      message: 'At least one image is required.',
    },
  },
  allowBackorder: {
    type: Boolean,
    default: false,
  },

  videos: {
    type: [String],
    default: [],
  },
  averageRating: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  }

}, { timestamps: true });

productVariantSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.sizes = ret.sizes.map(s => ({
      ...s,
      price: parseFloat(s.price?.toString() || '0'),
      salePrice: parseFloat(s.salePrice?.toString() || '0')
    }));
    ret.weightInKg = parseFloat(ret.weightInKg?.toString() || '0');
    return ret;
  }
});

productVariantSchema.index({ productId: 1 });
productVariantSchema.index({ businessId: 1 });

module.exports = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);
