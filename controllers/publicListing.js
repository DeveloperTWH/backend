const Service = require('../models/Service');
const Review = require('../models/Review');
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
      businessId,
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

    if (businessId) filters.businessId = businessId;

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


// GET /api/public/services/:slug

exports.getServiceBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const service = await Service.findOne({ slug, isPublished: true })
      .populate('categories.categoryId', 'name')
      .populate('ownerId', 'businessName');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    // 👉 Fetch related reviews
    const reviews = await Review.find({
      listingId: service._id,
      listingType: 'service',
    })
      .populate('userId', 'name profileImage'); // Adjust fields as needed

    res.status(200).json({
      success: true,
      data: {
        service,
        reviews,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




// controllers/publicListing.js
const Food = require('../models/Food');
const FoodCategory = require('../models/FoodCategory');

exports.getAllFood = async (req, res) => {
  try {
    const {
      search = '',
      city,
      state,
      country,
      minorityType,
      categorySlug,
      businessId,
      sort,
      offers,
      page = 1,
      limit = 10,
      outOfStock = false,
    } = req.query;

    const filters = { isPublished: true };  // Ensure we only fetch active food items

    // Search filter
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Filter by minorityType, city, state, and country
    if (minorityType) filters.minorityType = minorityType;
    if (city) filters['address.city'] = { $regex: city, $options: 'i' };
    if (state) filters['address.state'] = { $regex: state, $options: 'i' };
    if (country) filters['address.country'] = { $regex: country, $options: 'i' };

    // Filter by businessId
    if (businessId) filters.businessId = businessId;

    // Category Slug to categoryId conversion
    if (categorySlug) {
      const category = await FoodCategory.findOne({ slug: categorySlug });
      if (category) {
        filters.categoryId = category._id;
      } else {
        return res.json({ success: true, total: 0, page: parseInt(page), totalPages: 0, data: [] });
      }
    }

    // Offers filter
    if (offers === 'true') filters.features = { $in: ['Offers Available'] };

    // Out of stock filter
    if (outOfStock === 'true') {
      filters.stockQuantity = { $lte: 0 };  // Assuming stockQuantity tracks available stock
    }

    // Sorting logic
    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };

    // Pagination logic
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetching food items based on filters
    const foodItems = await Food.find(filters)
      .select('title description price slug coverImage')
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Food.countDocuments(filters);

    res.json({
      success: true,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: foodItems,
    });
  } catch (err) {
    console.error('Error fetching food items:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



const ProductVariant = require('../models/ProductVariant');
const Product = require('../models/Product');
const ProductCategory = require('../models/ProductCategory');

exports.getAllProducts = async (req, res) => {
  try {
    // Destructure query parameters from the request
    const {
      search = '',
      city,
      state,
      country,
      minorityType,
      categorySlug,
      businessId,
      sort,
      offers,
      page = 1,
      limit = 10,
      outOfStock = false,
    } = req.query;

    // Set the initial filters for active and published products
    const filters = { isDeleted: false, isPublished: true };

    // Add search filters for product title and description
    if (search) {
      filters.$or = [
        { 'product.title': { $regex: search, $options: 'i' } },  // Search in product title
        { 'product.description': { $regex: search, $options: 'i' } },  // Search in product description
      ];
    }

    // Filter by minorityType, city, state, and country if provided
    if (minorityType) filters.minorityType = minorityType;
    if (city) filters['address.city'] = { $regex: city, $options: 'i' };
    if (state) filters['address.state'] = { $regex: state, $options: 'i' };
    if (country) filters['address.country'] = { $regex: country, $options: 'i' };

    // Filter by businessId if provided
    if (businessId) filters.businessId = businessId;

    // Convert categorySlug to categoryId and add it to filters
    if (categorySlug) {
      const category = await ProductCategory.findOne({ slug: categorySlug });
      if (category) {
        filters.categoryId = category._id;
      } else {
        return res.json({ success: true, total: 0, page: parseInt(page), totalPages: 0, data: [] });
      }
    }

    // Filter by offers if provided
    if (offers === 'true') filters.features = { $in: ['Offers Available'] };

    // Filter by outOfStock if provided
    if (outOfStock === 'true') {
      filters.stockQuantity = { $lte: 0 };  // Assuming stockQuantity is the field for available stock
    }

    // Sorting logic based on the sort query parameter
    let sortOption = { createdAt: -1 };  // Default sort by createdAt descending
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { averageRating: -1 };

    // Pagination logic: skip for pagination and limit for the number of products per page
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch products with populated variants (including necessary fields for variants)
    const products = await Product.find(filters)
      .select('title description coverImage')
      .populate({
        path: 'variants',  // Populate the variants array
        select: 'color price sku isPublished weightInKg images videos totalReviews averageRating sizes',  // Fields to include for variants
        match: { isPublished: true },  // Only include published variants
        options: { limit: parseInt(limit) },  // Limit the number of variants populated
      })
      .sort(sortOption)  // Apply sorting
      .skip(skip)  // Pagination: skip based on the page
      .limit(parseInt(limit));  // Limit the number of products

    // Total count for pagination
    const total = await Product.countDocuments(filters);

    // Return the result with pagination details
    res.json({
      success: true,
      total: products.length,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: products,
    });

  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// Route: /api/products/:productId

exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variants = await ProductVariant.find({ productId, isPublished: true, isDeleted: false })
      .select('color label price sku weightInKg images videos totalReviews averageRating sizes')
      .lean();

    res.json({
      success: true,
      data: {
        _id: product._id,
        title: product.title,
        description: product.description,
        brand: product.brand,
        categoryId: product.categoryId,
        subcategoryId: product.subcategoryId,
        businessId: product.businessId,
        coverImage: product.coverImage,
        specifications: product.specifications || [],
        isPublished: product.isPublished,
        variants: variants.map(variant => ({
          variantId: variant._id,
          color: variant.color,
          label: variant.label,
          images: variant.images,
          averageRating: variant.averageRating,
          totalReviews: variant.totalReviews,
          sizes: variant.sizes?.map((size) => ({
            sizeId: size._id,
            size: size.size,
            sku: size.sku,
            stock: size.stock,
            price: size.price ? Number(size.price) : 0,
            salePrice: size.salePrice ? Number(size.salePrice) : null,
            discountEndDate: size.discountEndDate ?? null,
          })) || [],
        }))
      }
    });

  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


