const Booking = require('../models/Booking');
const Service = require('../models/Service');

// ✅ Create Booking (Customer only)
exports.createBooking = async (req, res) => {
  try {
    const { name, email, phone, serviceId, serviceItems, date, time, notes, amountPaid, paymentStatus } = req.body;

    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    const newBooking = await Booking.create({
      serviceId,
      serviceTitle: service.title,
      serviceItems,
      date,
      time,
      notes,
      amountPaid,
      paymentStatus,
      businessId: service.businessId,
      ownerId: service.ownerId,
      customerId: req.user.id,
      customerInfo: { name, email, phone }

    });

    res.status(201).json({ success: true, booking: newBooking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create booking", error });
  }
};

// ✅ Vendor: Get all bookings for business (owned by this vendor)
exports.getVendorBookings = async (req, res) => {
  try {
    const { businessId, status } = req.query;

    if (!businessId) {
      return res.status(400).json({ success: false, message: "businessId is required" });
    }

    const query = {
      businessId,
      ownerId: req.user.id,
    };

    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("Error in getVendorBookings:", error);
    res.status(500).json({ success: false, message: "Failed to fetch bookings", error });
  }
};


// ✅ Status updates (confirm, complete, cancel)
exports.updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;


  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const userId = req.user.id;
    const isVendor = String(booking.ownerId) === userId;
    const isCustomer = String(booking.customerId) === userId;

    if (isVendor) {
      // ✅ Vendor can update to any valid status
      booking.status = status;
    } else if (isCustomer) {
      // ✅ Customer can only cancel and only if not completed
      if (status !== 'cancelled') {
        return res.status(403).json({ success: false, message: "You can only cancel your booking" });
      }

      if (booking.status === 'completed') {
        return res.status(400).json({ success: false, message: "Cannot cancel a completed booking" });
      }

      booking.status = 'cancelled';
    } else {
      return res.status(403).json({ success: false, message: "Not authorized to change this booking" });
    }

    await booking.save();

    res.json({ success: true, message: `Booking marked as ${booking.status}` });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ success: false, message: "Status update failed", error });
  }
};


// ✅ Delete Booking (Admin only)
exports.deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete booking", error });
  }
};
