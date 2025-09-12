const Service = require('../models/Service');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PendingImage = require('../models/PendingImage');
const deleteCloudinaryFile = require('../utils/deleteCloudinaryFile');

require('../models/ServiceCategory');
require('../models/ServiceSubcategory');
const { geocodeAddress } = require('../utils/geocode'); // You must create this helper



exports.createService = async (req, res) => {
  const session = await Service.startSession();
  session.startTransaction();
  try {
    const {
      title,
      description,
      price,
      duration,
      services,
      categories,
      coverImage,
      images,
      features,
      amenities,
      businessHours,
      location,
      contact,
      faq,
      videos,
      isPublished,
      maxBookingsPerSlot,
      businessId, // Sent from frontend
    } = req.body;

    const userId = req.user._id;

    // 🛡️ Step 1: Verify ownership
    const business = await Business.findOne({ _id: businessId, owner: userId });
    if (!business)
      return res.status(403).json({ error: 'You do not own this business.' });

    if (!business.isApproved)
      return res.status(400).json({ error: 'Business is not approved yet.' });

    if (business.listingType !== 'service')
      return res.status(400).json({ error: 'This business is not allowed to list services.' });

    // 📅 Step 2: Subscription check
    const subscription = await Subscription.findOne({
      _id: business.subscriptionId,
      businessId,
      status: 'active',
      paymentStatus: 'COMPLETED',
      endDate: { $gte: new Date() },
    });

    if (!subscription)
      return res.status(403).json({ error: 'Valid subscription not found.' });

    const subscriptionPlan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
    const serviceLimit = subscriptionPlan?.limits?.serviceListings || 0;

    const existingServiceCount = await Service.countDocuments({ ownerId: userId });

    if (existingServiceCount >= serviceLimit) {
      return res.status(403).json({
        error: `Service listing limit reached for your subscription. You can add up to ${serviceLimit} services.`,
      });
    }

    // 📍 Step 3: Prepare coordinates (handle [0,0] as missing)
    let finalCoordinates;

    const rawCoords = Array.isArray(location?.coordinates) ? location.coordinates : null;
    const hasTwo = rawCoords && rawCoords.length === 2 && rawCoords.every(n => Number.isFinite(Number(n)));
    const isZero = hasTwo && Number(rawCoords[0]) === 0 && Number(rawCoords[1]) === 0;

    if (hasTwo && !isZero) {
      // Already have valid non-zero coordinates (assume tracked mode)
      finalCoordinates = [Number(rawCoords[0]), Number(rawCoords[1])];
    } else {
      // Manual entry path → we must geocode the address
      if (!contact?.address?.trim()) {
        return res.status(400).json({
          error: 'Contact address is required when coordinates are missing or [0,0].'
        });
      }

      const geo = await geocodeAddress(contact.address.trim());
      if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
        return res.status(422).json({
          error: 'Unable to geocode the provided address. Please verify the address and try again.'
        });
      }

      // GeoJSON order: [lng, lat]
      finalCoordinates = [geo.lng, geo.lat];
    }

    // ✅ Step 4: Save service
    const service = new Service({
      title,
      description,
      price,
      duration,
      services,
      categories,
      coverImage,
      images,
      isPublished,
      features,
      amenities,
      businessHours,
      contact,
      faq,
      videos,
      maxBookingsPerSlot,
      ownerId: userId,
      businessId,
      minorityType: business.minorityType,
      location: {
        type: 'Point',
        coordinates: finalCoordinates,
      },
    });

    await service.save();

    const usedImages = [coverImage, ...images];
    await PendingImage.deleteMany({ url: { $in: usedImages } });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Service created successfully.',
      service,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    const usedImages = [req.body.coverImage, ...(req.body.images || [])];
    for (const image of usedImages) {
      await deleteCloudinaryFile(image);
      await PendingImage.deleteOne({ url: image });
    }

    if (err?.message?.includes('REQUEST_DENIED')) {
      return res.status(502).json({ error: 'Geocoding denied: check API key/billing/restrictions.' });
    }
    if (err?.message?.includes('OVER_QUERY_LIMIT')) {
      return res.status(429).json({ error: 'Geocoding rate limit reached. Please try again later.' });
    }


    console.error('Service creation failed:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to create service' });
  }
};




exports.getMyServices = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🔍 Query params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isPublished = req.query.isPublished;
    const categoryId = req.query.categoryId;

    const filters = { ownerId: userId };

    if (isPublished === 'true') filters.isPublished = true;
    if (isPublished === 'false') filters.isPublished = false;

    if (categoryId) {
      filters['categories.categoryId'] = categoryId;
    }

    const services = await Service.find(filters)
      .populate('categories.categoryId', 'name') // populate category name
      .populate('categories.subcategoryIds', 'name') // populate subcategory names
      .populate('ownerId', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Service.countDocuments(filters);

    res.status(200).json({
      services,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (err) {
    console.error('Failed to fetch user services:', err.message);
    res.status(500).json({ error: err.message || 'Failed to retrieve services.' });
  }
};




exports.deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user._id;

    // Find service
    const service = await Service.findOne({ _id: serviceId, ownerId: userId });
    if (!service)
      return res.status(404).json({ error: 'Service not found or unauthorized.' });

    // Delete images from Cloudinary
    const usedImages = [service.coverImage, ...service.images];
    for (const image of usedImages) {
      await deleteCloudinaryFile(image);
    }

    await service.deleteOne();

    res.status(200).json({ message: 'Service deleted successfully.' });
  } catch (err) {
    console.error('Failed to delete service:', err.message);
    res.status(500).json({ error: 'Failed to delete service.' });
  }
};




exports.updateService = async (req, res) => {
  try {
    const userId = req.user._id;
    const serviceId = req.params.id;

    const service = await Service.findOne({ _id: serviceId, ownerId: userId });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // ✅ Delete old cover image if changed
    if (req.body.coverImage && req.body.coverImage !== service.coverImage) {
      await deleteCloudinaryFile(service.coverImage);
    }

    // ✅ Delete removed images
    if (
      Array.isArray(req.body.images) &&
      Array.isArray(service.images)
    ) {
      const removedImages = service.images.filter(img => !req.body.images.includes(img));
      for (const image of removedImages) {
        await deleteCloudinaryFile(image);
      }
    }


    const updatableFields = [
      'title', 'description', 'price', 'duration', 'services', 'isPublished',
      'categories', 'coverImage', 'images', 'features', 'amenities',
      'businessHours', 'contact', 'faq', 'videos', 'maxBookingsPerSlot'
    ];

    const oldAddr = (service.contact?.address || '').trim();
    // Update basic fields
    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    // 📍 Handle location update (coordinates or address)
    if (typeof req.body?.contact?.address === 'string') {
      const newAddr = req.body.contact.address.trim();
      
      if (newAddr && newAddr !== oldAddr) {
        const geo = await geocodeAddress(newAddr);
        if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
          return res.status(422).json({ message: 'Unable to geocode the provided address.' });
        }
        service.location = { type: 'Point', coordinates: [geo.lng, geo.lat] };
        // Optional: normalize stored address from geocoder if you prefer
        // if (geo.formatted) service.contact.address = geo.formatted;
      }
    }

    // 🔁 Regenerate slug if title changed
    if (req.body.title && req.body.title !== service.title) {
      const baseSlug = slugify(req.body.title, { lower: true, strict: true });
      let slug = baseSlug;
      let counter = 1;
      while (await Service.findOne({ slug, _id: { $ne: service._id } })) {
        slug = `${baseSlug}-${counter++}`;
      }
      service.slug = slug;
    }

    await service.save();

    res.status(200).json({
      message: 'Service updated successfully',
      service
    });
  } catch (error) {
    console.error('Service update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




exports.getServiceById = async (req, res) => {
  try {
    const userId = req.user._id;
    const serviceId = req.params.id;

    const service = await Service.findOne({ _id: serviceId, ownerId: userId })
      .populate('categories.categoryId', 'name')
      .populate('ownerId', 'name email');

    if (!service) {
      return res.status(404).json({ message: 'Service not found or unauthorized.' });
    }

    res.status(200).json({ service });
  } catch (err) {
    console.error('Failed to fetch service:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
