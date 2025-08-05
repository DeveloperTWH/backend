const express = require('express');
const router = express.Router();
const {
  createProductSubcategory,
  getProductSubcategories,
  updateProductSubcategory,
  deleteProductSubcategory,
} = require('../../controllers/admin/productSubcategoryController');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');


router.get('/', getProductSubcategories);

// All routes protected for admin
router.use(authenticate, isAdmin);

router.post('/', createProductSubcategory);
router.put('/:id', updateProductSubcategory);
router.delete('/:id', deleteProductSubcategory);

module.exports = router;
