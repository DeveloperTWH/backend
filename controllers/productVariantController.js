const Product = require('../models/Product');
const ProductVariant = require('../models/ProductVariant');
const { validationResult } = require('express-validator');
const { savePendingImage } = require('../utils/savePendingImage'); 

// Controller for adding variants to an existing product
exports.addVariants = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { productId } = req.params;  // Get productId from the URL
  const { variants } = req.body;     // Get variants from the request body

  try {
    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if the user is authorized to add variants (e.g., business ownership)
    if (product.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You are not authorized to add variants to this product' });
    }

    // Map the variants to the format of the ProductVariant model
    const variantDocs = variants.map((variant) => ({
      productId,
      color: variant.color,
      sizes: variant.sizes.map((size) => ({
        size: size.size,
        stock: size.stock,
        price: size.price,
        sku: size.sku,
      })),
      images: variant.images,
      isPublished: variant.isPublished || false,
      isDeleted: variant.isDeleted || false,
    }));

    // Save the variants to the database
    const savedVariants = await ProductVariant.insertMany(variantDocs);

    // Respond with the newly created variants
    return res.status(201).json({
      message: 'Variants added successfully.',
      variants: savedVariants,
    });
  } catch (err) {
    console.error('Error adding variants:', err);
    return res.status(500).json({ error: 'Server error while adding variants' });
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