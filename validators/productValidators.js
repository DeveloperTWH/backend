const { body } = require('express-validator');

exports.validateProductInput = [
  body('title').notEmpty(),
  body('description').notEmpty(),
  body('categoryId').notEmpty(),
  body('subcategoryId').notEmpty(),
  body('businessId').notEmpty(),
  body('variants').isArray({ min: 1 }).withMessage('At least one variant is required.'),
  body('variants.*.price').isNumeric().withMessage('Price must be a number.'),
  body('variants.*.stock').isInt({ min: 0 }),
  body('variants.*.sku').notEmpty(),
];
