const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productVariantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
  },
  { timestamps: true }
);


wishlistSchema.index({ customerId: 1, productVariantId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
