const express = require('express');
const { getFeaturedProducts } = require('../controllers/featuredProducts.controller');

const router = express.Router();

// Get featured products (public route)
router.get('/featured-products', getFeaturedProducts);

module.exports = router;