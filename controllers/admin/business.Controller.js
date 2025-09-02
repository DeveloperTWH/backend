// controllers/businessController.js
const Business = require("../../models/Business");
const { sendBusinessStatusEmail } = require("../../utils/approvalMail");

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
    const business = await Business.findById(req.params.id)
      .select("owner businessName slug listingType email isApproved isActive onboardingStatus")
      .populate("owner", "name email");

    if (!business) {
      return res.status(404).json({ success: false, message: "Business not found." });
    }

    const nextIsApproved = !business.isApproved;

    // ✅ Only allow toggling to APPROVED if onboardingStatus === 'completed'
    if (nextIsApproved) {
      const onboarding = String(business.onboardingStatus || "").toLowerCase();
      if (onboarding !== "completed") {
        return res.status(400).json({
          success: false,
          message: "Cannot approve this business until onboarding is completed.",
          data: { onboardingStatus: business.onboardingStatus || null },
        });
      }
    }

    // Toggle approval + active
    business.isApproved = nextIsApproved;
    business.isActive = nextIsApproved ? true : false;

    await business.save();

    const statusText = nextIsApproved ? "approved and activated" : "disapproved and deactivated";

    // ---- Email to both owner and business email (deduped) ----
    try {
      const ownerEmail = business?.owner?.email || null;
      const bizEmail = business?.email || null;
      const recipients = [...new Set([ownerEmail, bizEmail].filter(Boolean))]; // dedupe + drop falsy

      if (recipients.length > 0) {
        // neutral greeting if sending to multiple recipients
        const vendorName =
          recipients.length > 1
            ? (business?.owner?.name || business.businessName || "there") : (business.businessName || "there");

        await sendBusinessStatusEmail({
          to: recipients, // string or string[] supported by Nodemailer
          vendorName,
          business: {
            name: business.businessName,
            slug: business.slug,
            type: business.listingType, // 'service' | 'product' | 'food'
          },
          action: nextIsApproved ? "approved" : "blocked",
          adminNote: !nextIsApproved ? (req.body?.reason || "") : undefined, // optional when blocking
        });
      } else {
        console.warn("No recipient email found for business", business._id.toString());
      }
    } catch (mailErr) {
      console.error("Email send failed (toggleBusinessStatus):", mailErr);
      // don't fail API due to email issues
    }
    // ---------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: `Business has been ${statusText} successfully.`,
      data: business,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};
