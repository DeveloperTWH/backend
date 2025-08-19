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
    const variantCount = await ProductVariant.countDocuments({ businessId, isDeleted: false  });

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
      label: variant.label || 'Size',
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
      const variantIds = savedVariants.map((variant) => variant._id);
      await Product.findByIdAndUpdate(product._id, { $push: { variants: { $each: variantIds } } });

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
      label: variant.label || 'Size',
      sizes: variant.sizes.map((size) => ({
        size: size.size,
        stock: size.stock,
        price: size.price,
        salePrice: size.salePrice,
        sku: size.sku,
        discountEndDate: size.discountEndDate,
      })),
      images: variant.images,
      allowBackorder: variant.allowBackorder || false,
      isPublished: variant.isPublished || false,
      isDeleted: false,
    }));

    // Save the variants to the database
    const savedVariants = await ProductVariant.insertMany(variantDocs);

    const variantIds = savedVariants.map((variant) => variant._id);
    await Product.findByIdAndUpdate(productId, { $push: { variants: { $each: variantIds } } });

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
  const { productId, variantId } = req.params;
  const {
    color,
    label,
    sizes,
    images,
    allowBackorder,
    isPublished,
    isDeleted,
  } = req.body;

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

    // Delete old images if changed
    if (images && images.length > 0) {
      const oldImages = variant.images || [];
      const imagesToDelete = oldImages.filter(image => !images.includes(image));
      for (const oldImage of imagesToDelete) {
        await deleteCloudinaryFile(oldImage);
      }
    }

    const oldColor = variant.color;

    // Update fields
    variant.color = color || variant.color;
    variant.label = label || variant.label;
    variant.sizes = sizes || variant.sizes;
    variant.images = images || variant.images;
    variant.allowBackorder = allowBackorder !== undefined ? allowBackorder : variant.allowBackorder;
    variant.isPublished = isPublished !== undefined ? isPublished : variant.isPublished;
    variant.isDeleted = isDeleted !== undefined ? isDeleted : variant.isDeleted;

    await variant.save();

    // Update product.variantOptions
    if (oldColor && oldColor !== color) {
      product.variantOptions.delete(oldColor);
    }
    if (color) {
      product.variantOptions.set(color, sizes.map((size) => size.size));
    }

    // ✅ Auto-publish product if variant is being published and product isn't yet published
    if (
      isPublished === true &&
      product.isPublished === false
    ) {
      product.isPublished = true;
    }

    // ✅ Auto-unpublish product if variant is being unpublished
    if (
      isPublished === false
    ) {
      const validVariantCount = await ProductVariant.countDocuments({
        productId,
        isPublished: true,
        isDeleted: false,
      });

      if (validVariantCount === 0) {
        product.isPublished = false;
      }
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Variant updated successfully.',
      variant,
    });

  } catch (err) {
    console.error('Error updating variant:', err);
    return res.status(500).json({ error: 'Server error while updating variant' });
  }
};



exports.deleteVariant = async (req, res) => {
  const { productId, variantId } = req.params;

  try {
    // Step 1: Validate product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Step 2: Ownership check
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to delete variants for this product' });
    }

    // Step 3: Validate variant
    const variant = await ProductVariant.findById(variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variant not found' });
    }

    // Step 4: Ensure variant belongs to product
    if (variant.productId.toString() !== productId) {
      return res.status(400).json({ error: 'This variant does not belong to this product' });
    }

    // Step 5: Soft delete the variant
    variant.isDeleted = true;
    await variant.save();

    // Step 6: Remove the color from variantOptions map (if present)
    if (variant.color && product.variantOptions?.has(variant.color)) {
      product.variantOptions.delete(variant.color);
    }

    // Step 7: Remove variant from product.variants array
    product.variants = product.variants.filter(
      vId => vId.toString() !== variantId.toString()
    );

    // Step 8: Check if any other valid variants exist
    const validVariantCount = await ProductVariant.countDocuments({
      productId,
      isDeleted: false,
      isPublished: true,
    });

    if (validVariantCount === 0) {
      product.isPublished = false;
    }

    // Save product after updates
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Variant soft deleted successfully.',
      productUnpublished: validVariantCount === 0,
    });

  } catch (err) {
    console.error('Error deleting variant:', err);
    return res.status(500).json({ error: 'Server error while deleting variant' });
  }
};





exports.deleteProduct = async (req, res) => {
  const { productId } = req.params; // Get productId from the URL

  try {
    console.log('Deleting product with ID:', productId);
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




exports.getProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Ensure that the current user is the owner of the product
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to Get this product' });
    }

    // Ensure fallback for optional fields
    product.specifications = product.specifications ?? [];
    product.variantOptions = product.variantOptions ?? {};

    return res.status(200).json({ product });
  } catch (err) {
    console.error('Error in getProductById:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const ownerId = req.user._id;
    const {
      title,
      description,
      brand,
      categoryId,
      subcategoryId,
      coverImage,
      specifications,
      isPublished,
    } = req.body;

    // Validate required fields
    if (
      !title || !description || !categoryId || !subcategoryId || !coverImage
    ) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product || product.isDeleted) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check ownership
    if (product.ownerId.toString() !== ownerId.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete old cover image if changed (and hosted on Cloudinary)
    if (
      product.coverImage &&
      product.coverImage !== coverImage &&
      product.coverImage.includes('s3.amazonaws.com')
    ) {
      await deleteCloudinaryFile(product.coverImage);
    }

    // Update product fields
    product.title = title;
    product.description = description;
    product.brand = brand || '';
    product.categoryId = categoryId;
    product.subcategoryId = subcategoryId;
    product.coverImage = coverImage;
    product.specifications = specifications || [];
    product.isPublished = !!isPublished;

    await product.save();

    // ✅ Update all variants' isPublished to match the product
    await ProductVariant.updateMany(
      { productId: product._id },
      { $set: { isPublished: !!isPublished } }
    );

    return res.status(200).json({
      message: 'Product updated successfully',
      product,
    });

  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};



exports.getVariantById = async (req, res) => {
  const { productId, variantId } = req.params;
  const userId = req.user._id; // comes from authenticate middleware

  try {
    const variant = await ProductVariant.findOne({
      _id: variantId,
      productId,
      ownerId: userId,
      isDeleted: false,
    });

    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant not found or unauthorized access' });
    }

    res.status(200).json({ success: true, variant });
  } catch (error) {
    console.error('Error fetching variant:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching variant' });
  }
};

