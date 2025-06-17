const Business = require('../models/Business');
const { uploadFile } = require('../utils/uploadFile');
const cleanupUploads = require('../utils/cleanupUploads');
const deleteCloudinaryFile = require('../utils/deleteCloudinaryFile');

exports.createBusiness = async (req, res) => {
    try {
        const user = req.user;

        // Subscription check
        if (!user.subscriptionId) {
            cleanupUploads(req.files);
            return res.status(403).json({ message: 'No active subscription. Please subscribe first.' });
        }

        await user.populate('subscriptionId');
        const today = new Date();
        if (!user.subscriptionId.endDate || today > new Date(user.subscriptionId.endDate)) {
            cleanupUploads(req.files);
            return res.status(403).json({ message: 'Your subscription has expired. Please renew.' });
        }
        const maxAllowed = user.subscriptionId?.limits?.maxBusinesses;

        if (!maxAllowed) {
            cleanupUploads(req.files);
            return res.status(403).json({ message: 'Your subscription plan is misconfigured.' });
        }

        const currentBusinessCount = await Business.countDocuments({ owner: user._id });
        if (currentBusinessCount >= maxAllowed) {
            cleanupUploads(req.files);
            return res.status(403).json({
                message: `Limit reached. Your plan allows only ${maxAllowed} business(es).`,
            });
        }

        const { businessName } = req.body;
        
        const nameToCheck = businessName?.trim();
        const existingBusiness = await Business.findOne({
            businessName: { $regex: new RegExp(`^${nameToCheck}$`, 'i') },
        });

        if (existingBusiness) {
            cleanupUploads(req.files);
            return res.status(409).json({ message: 'Business name already exists.' });
        }

        // Upload files to Cloudinary
        let logoUrl, coverUrl;
        if (req.files?.logo?.[0]) {
            logoUrl = await uploadFile(req.files.logo[0].path, 'business/logos');
        }
        if (req.files?.coverImage?.[0]) {
            coverUrl = await uploadFile(req.files.coverImage[0].path, 'business/covers');
        }

        const {
            description,
            email,
            phone,
            website,
            address,
            socialLinks,
            listingType,
            productCategories,
            serviceCategories,
            foodCategories,
        } = req.body;

        const business = new Business({
            businessName,
            description,
            email,
            phone,
            website,
            address,
            socialLinks,
            listingType,
            productCategories,
            serviceCategories,
            foodCategories,
            logo: logoUrl,
            coverImage: coverUrl,
            owner: user._id,
            isApproved: false, // always false by default
        });

        await business.save();

        res.status(201).json({
            message: 'Business created successfully',
            business,
        });

    } catch (error) {
        cleanupUploads(req.files);
        console.error('Business creation error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};




exports.getMyBusinesses = async (req, res) => {
    try {
        const businesses = await Business.find({ owner: req.user._id })
            .populate('productCategories.category')
            .populate('serviceCategories.category')
            .populate('foodCategories.category')
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: businesses.length,
            businesses,
        });

    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};





exports.updateBusiness = async (req, res) => {
  try {
    const user = req.user;
    const businessId = req.params.id;

    const business = await Business.findOne({ _id: businessId, owner: user._id });
    if (!business) {
      cleanupUploads(req.files);
      return res.status(404).json({ message: 'Business not found' });
    }

    // Check if new name is being updated and is unique
    if (req.body.businessName && req.body.businessName !== business.businessName) {
      const nameExists = await Business.findOne({
        businessName: { $regex: new RegExp(`^${req.body.businessName}$`, 'i') },
        _id: { $ne: businessId }
      });
      if (nameExists) {
        cleanupUploads(req.files);
        return res.status(409).json({ message: 'Business name already taken' });
      }
    }

    // Keep references to old images
    const oldLogo = business.logo;
    const oldCover = business.coverImage;

    // Handle uploads
    if (req.files?.logo?.[0]) {
      const newLogo = await uploadFile(req.files.logo[0].path, 'business/logos');
      business.logo = newLogo;
    }

    if (req.files?.coverImage?.[0]) {
      const newCover = await uploadFile(req.files.coverImage[0].path, 'business/covers');
      business.coverImage = newCover;
    }

    // Update other fields
    const updatableFields = [
      'businessName', 'description', 'email', 'phone', 'website',
      'address', 'socialLinks', 'listingType', 'productCategories',
      'serviceCategories', 'foodCategories'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) business[field] = req.body[field];
    });

    await business.save();

    // Delete old cloudinary files if replaced
    if (oldLogo && oldLogo !== business.logo) {
      await deleteCloudinaryFile(oldLogo);
    }

    if (oldCover && oldCover !== business.coverImage) {
      await deleteCloudinaryFile(oldCover);
    }

    res.json({ message: 'Business updated successfully', business });

  } catch (error) {
    cleanupUploads(req.files);
    console.error('Update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.deleteBusiness = async (req, res) => {
  try {
    const user = req.user;
    const businessId = req.params.id;

    const business = await Business.findOne({ _id: businessId, owner: user._id });
    if (!business) {
      return res.status(404).json({ message: 'Business not found' });
    }

    // Delete Cloudinary files if present
    if (business.logo) {
      await deleteCloudinaryFile(business.logo);
    }
    if (business.coverImage) {
      await deleteCloudinaryFile(business.coverImage);
    }

    await business.deleteOne();

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};