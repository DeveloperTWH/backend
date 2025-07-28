const Product = require('../models/Product');
const PendingImage = require('../models/PendingImage')
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
            isPublished,
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

        const subscriptionPlan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
        const productLimit = subscriptionPlan?.limits?.productListings || 0;

        // Count existing variants for the business (sellable items)
        const variantCount = await ProductVariant.countDocuments({ businessId });

        // Check if adding more variants would exceed the product listing limit
        if (variantCount + variants.length > productLimit) {
            return res.status(403).json({
                error: `Product variant limit reached for your subscription. You can add ${productLimit - variantCount} more variants.`,
            });
        }

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
            isPublished: isPublished,
            minorityType: business.minorityType,
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
            ownerId: userId,
            isDeleted: false,
            isPublished: isPublished,
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

        // Get the business associated with the product
        const businessId = product.businessId;
        const userId = req.user._id;

        // Check if the user is authorized to add variants (business ownership)
        if (product.ownerId.toString() !== userId.toString()) {
            return res.status(403).json({ error: 'You are not authorized to add variants to this product' });
        }

        // Find the business
        const business = await Business.findOne({ _id: businessId, owner: userId });
        if (!business) {
            return res.status(403).json({ error: 'You do not own this business.' });
        }

        // Check if the business is approved
        if (!business.isApproved) {
            return res.status(400).json({ error: 'Business is not approved yet.' });
        }

        // Check if the business is allowed to list products
        if (business.listingType !== 'product') {
            return res.status(400).json({ error: 'This business is not allowed to list products.' });
        }

        // Subscription check
        const subscription = await Subscription.findOne({
            _id: business.subscriptionId,
            businessId,
            status: 'active',
            paymentStatus: 'COMPLETED',
            endDate: { $gte: new Date() },
        });

        if (!subscription) {
            return res.status(403).json({ error: 'Valid subscription not found.' });
        }

        const subscriptionPlan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);
        const productLimit = subscriptionPlan?.limits?.productListings || 0;

        // Count existing variants for the business (sellable items)
        const variantCount = await ProductVariant.countDocuments({ businessId });

        // Check if adding more variants would exceed the product listing limit
        if (variantCount + variants.length > productLimit) {
            return res.status(403).json({
                error: `Product variant limit reached for your subscription. You can add ${productLimit - variantCount} more variants.`,
            });
        }

        // Create variant documents to be added
        const variantDocs = variants.map((variant) => ({
            productId,
            businessId: product.businessId,
            ownerId: userId,
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

        const updatedVariantOptions = new Map(product.variantOptions);

        variants.forEach((variant) => {
            if (!updatedVariantOptions.has(variant.color)) {
                updatedVariantOptions.set(variant.color, variant.sizes.map(size => size.size));
            } else {
                updatedVariantOptions.set(
                    variant.color,
                    [...updatedVariantOptions.get(variant.color), ...variant.sizes.map(size => size.size)]
                );
            }
        });

        product.variantOptions = updatedVariantOptions;
        await product.save();


        // Cleanup: Delete the image URLs from PendingImage collection
        if (variants && Array.isArray(variants)) {
            for (const variant of variants) {
                if (variant.images && Array.isArray(variant.images)) {
                    for (const image of variant.images) {
                        // Delete the image from the PendingImage collection
                        await PendingImage.deleteOne({ fileUrl: image });
                    }
                }
            }
        }

        return res.status(201).json({
            message: 'Variants added successfully.',
            variants: savedVariants,
        });
    } catch (err) {
        console.error('Error adding variants:', err);

        // If there's an error, cleanup the uploaded images
        if (variants && Array.isArray(variants)) {
            variants.forEach(async (variant) => {
                if (variant.images && Array.isArray(variant.images)) {
                    for (const image of variant.images) {
                        await deleteCloudinaryFile(image);  // Delete image from Cloudinary
                    }
                }
            });
        }

        return res.status(500).json({ error: 'Server error while adding variants' });
    }
};





exports.updateVariant = async (req, res) => {
  const { productId, variantId } = req.params; // Get productId and variantId from URL
  const { color, sizes, images, allowBackorder, isPublished, isDeleted } = req.body; // Get the data to update

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    if (variant.productId.toString() !== productId) {
      return res.status(400).json({ error: 'This variant does not belong to this product' });
    }

    // Check if the images are updated and remove old images from Cloudinary
    if (images && images.length > 0) {
      const oldImages = variant.images || [];
      const imagesToDelete = oldImages.filter(image => !images.includes(image));
      for (const oldImage of imagesToDelete) {
        await deleteCloudinaryFile(oldImage); // Delete old image from Cloudinary
      }
    }

    // Store the old color before updating
    const oldColor = variant.color;

    // Update variant fields
    variant.color = color || variant.color;
    variant.sizes = sizes || variant.sizes;
    variant.images = images || variant.images;
    variant.allowBackorder = allowBackorder !== undefined ? allowBackorder : variant.allowBackorder;
    variant.isPublished = isPublished !== undefined ? isPublished : variant.isPublished;
    variant.isDeleted = isDeleted !== undefined ? isDeleted : variant.isDeleted;

    // Save the updated variant
    await variant.save();

    // Remove the old color from variantOptions (if color is updated)
    if (oldColor && oldColor !== color) {
      product.variantOptions.delete(oldColor); // Remove the old color from the Map
    }

    // If the new color is provided, add it to the variantOptions map
    if (color) {
      product.variantOptions.set(color, sizes.map((size) => size.size)); // Add the updated color and sizes
    }

    // Save the updated product document with the updated variantOptions
    await product.save();

    return res.status(200).json({
      message: 'Variant updated successfully.',
      variant,
    });
  } catch (err) {
    console.error('Error updating variant:', err);
    return res.status(500).json({ error: 'Server error while updating variant' });
  }
};



exports.deleteVariant = async (req, res) => {
  const { productId, variantId } = req.params; // Get productId and variantId from URL

  try {
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the user owns the product
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete variants for this product' });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Ensure that the variant belongs to the specified product
    if (variant.productId.toString() !== productId) {
      return res.status(400).json({ error: 'This variant does not belong to this product' });
    }

    // Set isDeleted to true to soft delete the variant
    variant.isDeleted = true;

    // Save the updated variant
    await variant.save();

    // Remove the color from variantOptions in the product if it's soft deleted
    if (variant.color) {
      product.variantOptions.delete(variant.color); // Remove the color from the Map
    }

    // Save the updated product document
    await product.save();

    return res.status(200).json({
      message: 'Variant soft deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting variant:', err);
    return res.status(500).json({ error: 'Server error while deleting variant' });
  }
};





exports.deleteProduct = async (req, res) => {
  const { productId } = req.params; // Get productId from the URL

  try {
    // Find the product by productId
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Ensure that the current user is the owner of the product
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete this product' });
    }

    // Mark the product as deleted
    product.isDeleted = true;

    // Update all associated variants to be deleted
    const variants = await ProductVariant.find({ productId });
    for (const variant of variants) {
      variant.isDeleted = true;
      await variant.save();
    }

    // Save the updated product
    await product.save();

    return res.status(200).json({
      message: 'Product and associated variants have been soft deleted successfully.',
    });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: 'Server error while deleting product' });
  }
};
