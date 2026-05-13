const express = require('express');
const { toggleProductFeatured, getAllProducts } = require('../../controllers/admin/adminProduct.controller');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin product routes working' });
});

// Get all products (admin only)
router.get('/', authenticate, isAdmin, getAllProducts);

// Toggle product featured status (admin only)
router.patch('/:productId/featured', authenticate, isAdmin, toggleProductFeatured);

module.exports = router;