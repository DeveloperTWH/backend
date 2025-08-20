const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cartSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // Reference to the User model
    businessId: { type: Schema.Types.ObjectId, ref: 'Business', required: true },  // Reference to the Business model
    items: [{ type: Schema.Types.ObjectId, ref: 'CartItem' }],  // List of CartItem references
    totalItems: { type: Number, default: 0 },  // Total number of items in the cart
    isBooked: { type: Boolean, default: false },  // Indicates if the cart is booked/purchased
  },
  { timestamps: true }  // Automatically adds createdAt and updatedAt
);

// Indexes for better performance
cartSchema.index({ userId: 1 });
cartSchema.index({ businessId: 1 });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
