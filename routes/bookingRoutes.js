const express = require('express');
const router = express.Router();
const {
  createBooking,
  getVendorBookings,
  updateBookingStatus,
  deleteBooking
} = require('../controllers/bookingController');

const authenticate = require('../middlewares/authenticate');
const isCustomer = require('../middlewares/isCustomer');
const isAdmin = require('../middlewares/isAdmin'); // Create this if not already
const isBusinessOwner = require('../middlewares/isBusinessOwner'); // Optional, or handle via ownership

// ✅ Customer: Create Booking
router.post('/create', authenticate, isCustomer, createBooking);

// ✅ Vendor: Get all bookings
router.get('/vendor', authenticate, isBusinessOwner, getVendorBookings); // optionally add isVendor

// ✅ Vendor: Confirm Booking
router.put('/confirm/:id', authenticate, isBusinessOwner, (req, res) => {
  req.body.status = 'confirmed';
  updateBookingStatus(req, res);
});

// ✅ Vendor: Complete Booking
router.put('/complete/:id', authenticate, isBusinessOwner, (req, res) => {
  req.body.status = 'completed';
  updateBookingStatus(req, res);
});

// ✅ Vendor: Cancel Booking
router.put('/cancel/:id', authenticate, (req, res) => {
  req.body.status = 'cancelled';
  updateBookingStatus(req, res);
});

// ✅ Admin only: Delete Booking
router.delete('/:id', authenticate, isAdmin, deleteBooking);

module.exports = router;
