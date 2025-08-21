const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    variant: {
      type: String,
      required: true
    },
  },
  { timestamps: true }
);

// Indexes for better performance
cartItemSchema.index({ productId: 1 });
cartItemSchema.index({ variantId: 1 });
cartItemSchema.index({ businessId: 1 });

const CartItem = mongoose.model('CartItem', cartItemSchema);

module.exports = CartItem;
