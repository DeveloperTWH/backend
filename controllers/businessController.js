const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const { uploadFile } = require('../utils/uploadFile');
const cleanupUploads = require('../utils/cleanupUploads');
const deleteCloudinaryFile = require('../utils/deleteCloudinaryFile');
const { verifyPayPalPayment } = require('../utils/paypalVerification');


exports.createBusiness = async (req, res) => {
  try {
    const user = req.user;
    const {
      businessName,
      subscriptionPlanId,
      paymentId,
      paymentStatus,
      payerEmail,
      payerId,
    } = req.body;

    // Required fields check
    if (!subscriptionPlanId || !paymentId || !paymentStatus) {
      cleanupUploads(req.files);
      return res.status(400).json({ message: 'Missing subscription or payment info.' });
    }

    // Enforce completed payment
    if (paymentStatus !== 'COMPLETED') {
      cleanupUploads(req.files);
      return res.status(400).json({ message: 'Payment not completed. Try again after confirmation.' });
    }

    const isVerified = await verifyPayPalPayment(paymentId, payerId);
    if (!isVerified) {
      cleanupUploads(req.files);
      return res.status(400).json({ message: 'Failed to verify PayPal payment.' });
    }

    // Check if subscription already exists for this paymentId
    let subscription = await Subscription.findOne({ paymentId });

    if (!subscription) {
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(now.getFullYear() + 1); // 1-year plan

      subscription = new Subscription({
        userId: user._id,
        subscriptionPlanId,
        paymentId,
        paymentStatus,
        payerEmail,
        payerId,
        startDate: now,
        endDate,
        status: 'active',
        businessId: null,
      });

      await subscription.save();
    }

    // Prevent reusing subscription
    if (subscription.businessId) {
      cleanupUploads(req.files);
      return res.status(400).json({ message: 'This payment is already linked to a business.' });
    }

    // Check for duplicate business name
    const nameToCheck = businessName?.trim();
    const existingBusiness = await Business.findOne({
      businessName: { $regex: new RegExp(`^${nameToCheck}$`, 'i') },
    });

    if (existingBusiness) {
      return res.status(409).json({
        message: 'Business name already exists. Your subscription is saved. Please retry with a different name.',
        subscription,
      });
    }

    // Upload files to Cloudinary
    let logoUrl, coverUrl;
    if (req.files?.logo?.[0]) {
      logoUrl = await uploadFile(req.files.logo[0].path, 'business/logos');
    }
    if (req.files?.coverImage?.[0]) {
      coverUrl = await uploadFile(req.files.coverImage[0].path, 'business/covers');
    }

    // Extract form fields
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


    const hasProduct = Array.isArray(productCategories) && productCategories.length > 0;
    const hasService = Array.isArray(serviceCategories) && serviceCategories.length > 0;
    const hasFood = Array.isArray(foodCategories) && foodCategories.length > 0;

    const typeCount = [hasProduct, hasService, hasFood].filter(Boolean).length;
    if (typeCount !== 1) {
      cleanupUploads(req.files);
      return res.status(400).json({
        message: 'A business must list exactly one type: either Product, Service, or Food.',
      });
    }


    // Create business
    const newBusiness = new Business({
      businessName,
      description,
      email,
      phone,
      website,
      address: {
        street: req.body.address || '',
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
      },
      socialLinks,
      listingType,
      productCategories,
      serviceCategories,
      foodCategories,
      logo: logoUrl,
      coverImage: coverUrl,
      owner: user._id,
      isApproved: false,
      subscriptionId: subscription._id,
      minorityType: user.minorityType
    });

    await newBusiness.save();

    // Link business to subscription
    subscription.businessId = newBusiness._id;
    await subscription.save();

    res.status(201).json({
      message: 'Business and subscription created successfully',
      business: newBusiness,
      subscription,
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
      .populate('subscriptionId')
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

      // Generate new slug if business name changes
      const baseSlug = slugify(req.body.businessName, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;

      while (await Business.findOne({ slug, _id: { $ne: business._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }

      business.businessName = req.body.businessName;
      business.slug = slug;
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
      'listingType', 'productCategories', 'serviceCategories', 'foodCategories'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) business[field] = req.body[field];
    });

    if (req.body.address) {
      business.address = { ...business.address, ...req.body.address };
    }

    if (req.body.socialLinks) {
      business.socialLinks = { ...business.socialLinks, ...req.body.socialLinks };
    }

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

    // Unlink subscription
    await Subscription.updateOne(
      { _id: business.subscriptionId },
      { $set: { businessId: null } }
    );

    await business.deleteOne();

    res.json({ message: 'Business deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




// draft model;



const BusinessDraft = require('../models/BusinessDraft');

exports.createBusinessDraft = async (req, res) => {
  try {
    const {
      businessName,
      email,
      subscriptionPlanId,
      ...formData
    } = req.body;

    const user = req.user;

    // Check if business name already exists as a draft
    const existingDraft = await BusinessDraft.findOne({ businessName });
    if (existingDraft) {
      return res.status(409).json({ message: 'Business name already reserved. Please choose another.' });
    }


    // Check in live businesses
    const existingBusiness = await Business.findOne({ businessName });
    if (existingBusiness) {
      return res.status(409).json({ message: 'Business name already in use. Please choose another.' });
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min TTL

    const draft = await BusinessDraft.create({
      businessName,
      email,
      owner: user._id,
      subscriptionPlanId,
      formData,
      expiresAt,
    });

    res.status(201).json({
      message: 'Draft created. Please complete payment within 15 minutes.',
      draftId: draft._id,
      businessName: draft.businessName,
      expiresAt,
      subscriptionPlanId,
    });
  } catch (error) {
    console.error('Error creating business draft:', error);
    res.status(500).json({ message: 'Failed to create draft' });
  }
};
