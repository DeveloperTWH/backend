const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  serviceTitle: { type: String, required: true },
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
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true, // 🔥 REQUIRED to filter vendor orders by business
  },
  serviceItems: [String],   //  service : [hair cut, Shaving, hair cleaing etc]
  date: { type: Date, required: true },
  time: { type: String, required: true },

  status: {
    type: String,
    enum: ['created', 'Booked', 'confirmed', 'completed', 'cancelled'],
    default: 'Booked',
  },

  notes: { type: String },

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
