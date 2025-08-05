const express = require('express');
const router = express.Router();
const {
  createProductCategory,
  getAllProductCategories,
  getProductCategoryById,
  updateProductCategory,
  deleteProductCategory,
} = require('../../controllers/admin/productCategoryController');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

// Base: /api/admin/category/product

router.post('/', authenticate, isAdmin, createProductCategory);
router.get('/', getAllProductCategories);
router.get('/:id', authenticate, isAdmin, getProductCategoryById);
router.put('/:id', authenticate, isAdmin, updateProductCategory);
router.delete('/:id', authenticate, isAdmin, deleteProductCategory);

module.exports = router;