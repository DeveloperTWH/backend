const express = require('express');
const router = express.Router();
const {
  getProductSubcategories,
  getServiceSubcategories,
  getFoodSubcategories,
} = require('../controllers/subcategoryController');

// Public routes for subcategories
router.get('/products/subcategories/:categoryIdOrSlug', getProductSubcategories);
router.get('/services/subcategories/:categoryIdOrSlug', getServiceSubcategories);
router.get('/foods/subcategories/:categoryIdOrSlug', getFoodSubcategories);

module.exports = router;