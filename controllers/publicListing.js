const Service = require('../models/Service');
const ServiceCategory = require('../models/ServiceCategory');

exports.getAllServices = async (req, res) => {
  try {
    const {
      search = '',
      city,
      state,
      country,
      minorityType,
      categorySlug,  // ✅ New category filter
      sort,
      openNow,
      onlineBooking,
      offers,
      page = 1,
      limit = 10,
    } = req.query;

    const filters = { isPublished: true };

    // Search
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'services.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (minorityType) filters.minorityType = minorityType;
    if (city) filters['contact.address'] = { $regex: city, $options: 'i' };

    // ✅ Category Slug to categoryId conversion
    if (categorySlug) {
      const category = await ServiceCategory.findOne({ slug: categorySlug });
      if (category) {
        filters['categories.categoryId'] = category._id;
      } else {
        // If category not found, return empty result
        return res.json({ success: true, total: 0, page: parseInt(page), totalPages: 0, data: [] });
      }
    }

    if (onlineBooking === 'true') filters.features = { $in: ['Online Booking'] };
    if (offers === 'true') filters.features = { $in: ['Offers Available'] };

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };
    if (sort === 'reviews') sortOption = { totalReviews: -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const services = await Service.find(filters)
      .select('title services averageRating totalReviews slug description contact.address coverImage')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Service.countDocuments(filters);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: services,
    });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
