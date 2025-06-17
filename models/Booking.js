const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },

  status: {
    type: String,
    enum: ['confirmed', 'completed', 'cancelled'],
    default: 'confirmed',
  },

  notes: { type: String },

  // ✅ Payment Info
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentId: {
    type: String, // ID from Razorpay / Stripe / etc.
  },
  amountPaid: {
    type: Number,
    min: 0,
  },

  isRefundRequested: {
    type: Boolean,
    default: false,
  },
  refundStatus: {
    type: String,
    enum: ['not_requested', 'requested', 'approved', 'rejected', 'refunded'],
    default: 'not_requested',
  },
  refundReason: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
