const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  orderItems: [{
    productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    quantity: { type: Number, required: true },
    priceAtPurchase: { type: Number, required: true },
    discountApplied: { type: Number, default: 0 },
  }],
  // Embedding shipping address directly in the order
  shippingAddress: { 
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    pincode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'], 
    required: true 
  },
  transactionId: { 
    type: String, 
    required: true 
  },
  orderStatus: { 
    type: String, 
    enum: ['pending', 'shipped', 'completed', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  totalAmount: { 
    type: Number, 
    required: true 
  },
  promoCode: { 
    type: String 
  },
  promoDiscount: { 
    type: Number, 
    default: 0 
  },
  trackingNumber: { 
    type: String 
  },
  shippingCarrier: { 
    type: String 
  },
  refunds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Refund' 
  }],
  orderStatusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
