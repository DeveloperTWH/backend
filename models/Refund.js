const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  refundedItems: [{
    productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    quantity: { type: Number, required: true },
    refundAmount: { type: Number, required: true }, // Amount refunded for this item
  }],
  totalRefundAmount: { 
    type: Number, 
    required: true 
  },
  reason: { 
    type: String, 
    required: true 
  },
  refundStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  refundedAt: { 
    type: Date, 
    // Only set after the refund is processed successfully
  },
  transactionId: { 
    type: String, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    required: true, 
    default: 'PayPal' 
  },
  failureReason: { 
    type: String, 
    // This can store details of why the refund failed, like payment gateway errors
  }
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);
