const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const Business = require('../models/Business');
const Subscription = require('../models/Subscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { validationResult } = require('express-validator');
const deleteCloudinaryFile = require('../utils/deleteCloudinaryFile');

exports.createProductWithVariants = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });

        const userId = req.user._id;
        const {
            title,
            description,
            brand,
            categoryId,
            subcategoryId,
            businessId,
            variantOptions,
            specifications,
            coverImage,
            variants, // array of product variant documents
        } = req.body;

        // Validate variant array
        if (!Array.isArray(variants) || variants.length === 0) {
            return res
                .status(400)
                .json({ error: 'At least one product variant is required.' });
        }

        // Validate variantOptions: should be a Map-like object
        if (
            !variantOptions ||
            typeof variantOptions !== 'object' ||
            Array.isArray(variantOptions)
        ) {
            return res
                .status(400)
                .json({ error: 'Invalid variantOptions format. Should be a key-value object.' });
        }

        // Business ownership & approval
        const business = await Business.findOne({ _id: businessId, owner: userId });
        if (!business)
            return res
                .status(403)
                .json({ error: 'You do not own this business.' });

        if (!business.isApproved)
            return res
                .status(400)
                .json({ error: 'Business is not approved yet.' });

        if (business.listingType !== 'product')
            return res
                .status(400)
                .json({ error: 'This business is not allowed to list products.' });

        // Subscription check
        const subscription = await Subscription.findOne({
            _id: business.subscriptionId,
            businessId,
            status: 'active',
            paymentStatus: 'COMPLETED',
            endDate: { $gte: new Date() },
        });

        if (!subscription)
            return res
                .status(403)
                .json({ error: 'Valid subscription not found.' });

        const subscriptionPlan = await SubscriptionPlan.findById(
            subscription.subscriptionPlanId
        );
        const productLimit = subscriptionPlan?.limits?.productListings || 0;

        const productCount = await Product.countDocuments({ businessId });
        if (productCount >= productLimit)
            return res
                .status(403)
                .json({ error: 'Product listing limit reached for your subscription.' });

        // Create Product
        const product = new Product({
            title,
            description,
            brand,
            categoryId,
            subcategoryId,
            ownerId: userId,
            businessId,
            variantOptions,
            specifications,
            coverImage,
            isDeleted: false,
            isPublished: false,
        });

        await product.save();

        // Create Variants
        const variantDocs = variants.map((variant) => ({
            color: variant.color,
            images: variant.images || [],
            allowBackorder: !!variant.allowBackorder,
            sizes: (variant.sizes || []).map((s) => ({
                size: s.size,
                stock: s.stock,
                price: s.price,
                salePrice: s.salePrice,
                sku: s.sku,
                discountEndDate: s.discountEndDate,
            })),
            productId: product._id,
            businessId: business._id,
            isDeleted: false,
            isPublished: false,
        }));




        let savedVariants;
        try {
            savedVariants = await ProductVariant.insertMany(variantDocs);
        } catch (variantErr) {
            await Product.findByIdAndDelete(product._id); // rollback orphan product

            if (coverImage) {
                await deleteCloudinaryFile(coverImage);
            }
            if (variants && Array.isArray(variants)) {
                variants.forEach(async (variant) => {
                    if (variant.images && Array.isArray(variant.images)) {
                        for (const image of variant.images) {
                            await deleteCloudinaryFile(image);
                        }
                    }
                });
            }

            return res.status(400).json({
                error: 'Error creating product variants.',
                details: variantErr.message,
            });
        }

        return res.status(201).json({
            message: 'Product and variants created successfully.',
            product,
            variants: savedVariants,
        });
    } catch (err) {
        console.error('Error in product creation:', err);

        if (coverImage) {
            await deleteCloudinaryFile(coverImage);
        }
        if (variants && Array.isArray(variants)) {
            variants.forEach(async (variant) => {
                if (variant.images && Array.isArray(variant.images)) {
                    for (const image of variant.images) {
                        await deleteCloudinaryFile(image);
                    }
                }
            });
        }

        return res
            .status(500)
            .json({ error: 'Server error while creating product.' });
    }
};



// Controller for adding variants to an existing product
exports.addVariants = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId } = req.params; // Get productId from the URL
  const { variants } = req.body;    // Get variants from the request body

  try {
    // Find the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the user is authorized to add variants (e.g., business ownership)
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to add variants to this product' });
    }

    // Create variant documents to be added
    const variantDocs = variants.map((variant) => ({
      productId,
      businessId: product.businessId,
      color: variant.color,
      sizes: variant.sizes.map((size) => ({
        size: size.size,
        stock: size.stock,
        price: size.price,
        sku: size.sku,
        discountEndDate: size.discountEndDate,
      })),
      images: variant.images,
      allowBackorder: variant.allowBackorder || false,
      isPublished: variant.isPublished || false,
      isDeleted: variant.isDeleted || false,
    }));

    // Save the variants to the database
    const savedVariants = await ProductVariant.insertMany(variantDocs);

    return res.status(201).json({
      message: 'Variants added successfully.',
      variants: savedVariants,
    });
  } catch (err) {
    console.error('Error adding variants:', err);
    return res.status(500).json({ error: 'Server error while adding variants' });
  }
};
