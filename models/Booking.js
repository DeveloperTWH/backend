const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingType: {
    type: String,
    enum: ['service', 'food'],
    default: 'service',
  },
  serviceTitle: {
    type: String,
    required: false,
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false,
  },
  foodTitle: {
    type: String,
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: false,
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
    ref: 'Business',
    required: true,
  },
  serviceItems: [String],
  services: {
    type: [String],
    default: [],
  },
  date: { type: Date, required: true },
  time: { type: String, required: false },
  slot: { type: String, required: false },
  seats: {
    type: String,
    enum: ['upto 2', 'upto 4', 'upto 8', 'more than 10'],
  },
  status: {
    type: String,
    enum: [
      'created',
      'Booked',
      'pending_vendor_action',
      'payment_requested',
      'approved',
      'confirmed',
      'completed',
      'cancelled',
      'rejected',
    ],
    default: 'Booked',
  },
  paymentLink: {
    type: String,
    trim: true,
  },
  paymentRequestedAt: {
    type: Date,
  },
  vendorDecisionAt: {
    type: Date,
  },
  vendorDecisionNote: {
    type: String,
    trim: true,
  },
  notes: { type: String },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentId: {
    type: String,
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

bookingSchema.pre('validate', function (next) {
  if (this.bookingType === 'service' && !this.status) {
    this.status = 'pending_vendor_action';
  }

  if (this.bookingType === 'food' && !this.status) {
    this.status = 'Booked';
  }

  if (!this.slot && this.time) {
    this.slot = this.time;
  }

  if (!this.time && this.slot) {
    this.time = this.slot;
  }

  if ((!this.services || this.services.length === 0) && Array.isArray(this.serviceItems) && this.serviceItems.length > 0) {
    this.services = this.serviceItems;
  }

  if ((!this.serviceItems || this.serviceItems.length === 0) && Array.isArray(this.services) && this.services.length > 0) {
    this.serviceItems = this.services;
  }

  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
