const express = require('express');
const router = express.Router();
const controller = require('../../controllers/admin/foodCategoryController')
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

router.get('/', controller.getFoodCategories);
router.post('/', authenticate, isAdmin, controller.createFoodCategory);
router.put('/:id', authenticate, isAdmin, controller.updateFoodCategory);
router.delete('/:id', authenticate, isAdmin, controller.deleteFoodCategory);

module.exports = router;
