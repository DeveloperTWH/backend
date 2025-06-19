const { body } = require('express-validator');

exports.validateProductInput = [
  body('title').notEmpty().withMessage('Title is required.'),
  body('description').notEmpty().withMessage('Description is required.'),
  body('categoryId').notEmpty().withMessage('Category ID is required.'),
  body('subcategoryId').notEmpty().withMessage('Subcategory ID is required.'),
  body('businessId').notEmpty().withMessage('Business ID is required.'),
  body('variants').isArray({ min: 1 }).withMessage('At least one variant is required.'),

  body('variants.*.color').notEmpty().withMessage('Color is required for each variant.'),
  body('variants.*.images').isArray({ min: 1 }).withMessage('At least one image is required per variant.'),

  body('variants.*.sizes').isArray({ min: 1 }).withMessage('Each variant must have sizes.'),
  body('variants.*.sizes.*.size').notEmpty().withMessage('Size is required.'),
  body('variants.*.sizes.*.stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer.'),
  body('variants.*.sizes.*.price').isNumeric().withMessage('Price must be a number.'),
  body('variants.*.sizes.*.salePrice').optional().isNumeric().withMessage('Sale price must be a number.'),
  body('variants.*.sizes.*.sku').notEmpty().withMessage('SKU is required.'),

  // Optional fields
  body('variantOptions').optional().isObject().withMessage('Variant options must be an object.'),
  body('specifications').optional().isArray(),
];


// Validation for product variant input
exports.validateVariantInput = [
  body('variants').isArray().withMessage('Variants must be an array'),
  body('variants.*.color').notEmpty().withMessage('Color is required for each variant'),
  body('variants.*.sizes').isArray().withMessage('Sizes must be an array'),
  body('variants.*.sizes.*.size').notEmpty().withMessage('Size is required'),
  body('variants.*.sizes.*.stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative number'),
  body('variants.*.sizes.*.price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('variants.*.sizes.*.sku').notEmpty().withMessage('SKU is required for each size'),
];
