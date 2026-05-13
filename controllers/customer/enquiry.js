const mongoose = require('mongoose');

const Business = require('../../models/Business');
const BusinessEnquiry = require('../../models/BusinessEnquiry');

exports.createRevealEnquiry = async (req, res) => {
  try {
    const { businessId, source = 'vendor_profile_reveal' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid businessId is required',
      });
    }

    const business = await Business.findById(businessId)
      .select('_id owner businessName isActive isApproved')
      .lean();

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    if (business.owner?.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot create an enquiry for your own business',
      });
    }

    const now = new Date();
    const customerPhone = req.user.mobile || '';

    const enquiry = await BusinessEnquiry.findOneAndUpdate(
      {
        businessId: business._id,
        customerId: req.user._id,
        source,
      },
      {
        $set: {
          vendorId: business.owner,
          customerName: req.user.name,
          customerEmail: req.user.email,
          customerPhone,
          lastRevealedAt: now,
        },
        $setOnInsert: {
          businessId: business._id,
          customerId: req.user._id,
          source,
        },
        $inc: {
          revealCount: 1,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const createdNow = enquiry.createdAt?.getTime() === enquiry.updatedAt?.getTime();

    return res.status(createdNow ? 201 : 200).json({
      success: true,
      message: createdNow
        ? 'Enquiry saved successfully'
        : 'Enquiry updated successfully',
      data: {
        _id: enquiry._id,
        businessId: enquiry.businessId,
        vendorId: enquiry.vendorId,
        customerId: enquiry.customerId,
        customerName: enquiry.customerName,
        customerEmail: enquiry.customerEmail,
        customerPhone: enquiry.customerPhone,
        source: enquiry.source,
        revealCount: enquiry.revealCount,
        lastRevealedAt: enquiry.lastRevealedAt,
      },
    });
  } catch (error) {
    console.error('Error creating reveal enquiry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save enquiry',
    });
  }
};

exports.getVendorEnquiries = async (req, res) => {
  try {
    const { businessId, page = 1, limit = 20 } = req.query;

    const ownedBusinessFilter = { owner: req.user._id };

    if (businessId) {
      if (!mongoose.Types.ObjectId.isValid(businessId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid businessId',
        });
      }

      ownedBusinessFilter._id = businessId;
    }

    const businesses = await Business.find(ownedBusinessFilter)
      .select('_id businessName')
      .lean();

    if (!businesses.length) {
      return res.status(200).json({
        success: true,
        total: 0,
        page: Number(page),
        totalPages: 0,
        data: [],
      });
    }

    const businessIds = businesses.map((item) => item._id);
    const businessNameMap = new Map(
      businesses.map((item) => [item._id.toString(), item.businessName])
    );

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const [enquiries, total] = await Promise.all([
      BusinessEnquiry.find({
        vendorId: req.user._id,
        businessId: { $in: businessIds },
      })
        .sort({ lastRevealedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .populate('customerId', 'name email mobile profileImage')
        .lean(),
      BusinessEnquiry.countDocuments({
        vendorId: req.user._id,
        businessId: { $in: businessIds },
      }),
    ]);

    const data = enquiries.map((enquiry) => ({
      ...enquiry,
      businessName: businessNameMap.get(enquiry.businessId?.toString()) || null,
    }));

    return res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      data,
    });
  } catch (error) {
    console.error('Error fetching vendor enquiries:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch enquiries',
    });
  }
};
