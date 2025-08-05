// controllers/businessController.js
const Business = require("../../models/Business");

exports.getAllBusinesses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10; // default 10
    const page = parseInt(req.query.page) || 1; // default 1

    const skip = (page - 1) * limit;

    // Fetch paginated businesses
    const businesses = await Business.find().skip(skip).limit(limit);

    // Total count (for frontend pagination)
    const totalBusinesses = await Business.countDocuments();

    // Not approved count
    const notApprovedCount = await Business.countDocuments({ isApproved: false });

    // If none found
    if (!businesses || businesses.length === 0) {
      return res.status(404).json({ success: true, message: "No businesses found." });
    }

    return res.status(200).json({
      success: true,
      data: businesses,
      message: "Businesses retrieved successfully",
      totalBusinesses,
      notApprovedCount,
      currentPage: page,
      totalPages: Math.ceil(totalBusinesses / limit),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};


exports.toggleBusinessStatus = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    // Toggle both isApproved and isActive fields
    business.isApproved = !business.isApproved;
    business.isActive = business.isApproved ? true : false; // If approved, activate; if not approved, deactivate

    await business.save(); // Save the updated business

    const status = business.isApproved ? "approved and activated" : "disapproved and deactivated";

    // Return success message
    return res.status(200).json({
      success: true,
      message: `Business has been ${status} successfully.`,
      data: business,
    });
  } catch (error) {
    console.error(error); // Log the error for debugging

    // Handle server errors
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
