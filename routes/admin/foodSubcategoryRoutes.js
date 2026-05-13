// routes/admin/foodSubcategoryRoutes.js
const express = require('express');
const router = express.Router();
const {
  createFoodSubcategory,
  getFoodSubcategories,
  updateFoodSubcategory,
  deleteFoodSubcategory,
} = require('../../controllers/admin/foodSubcategoryController');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

router.get('/', getFoodSubcategories);

router.use(authenticate, isAdmin);

router.post('/', createFoodSubcategory);
router.put('/:id', updateFoodSubcategory);
router.delete('/:id', deleteFoodSubcategory);

module.exports = router;
