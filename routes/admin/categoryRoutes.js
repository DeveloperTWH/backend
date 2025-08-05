const express = require('express');
const router = express.Router();
const serviceCategoryController = require('../../controllers/admin/serviceCategoryController');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

router.get('/', serviceCategoryController.getServiceCategories);
router.post('/', authenticate, isAdmin, serviceCategoryController.createServiceCategory);
router.put('/:id', authenticate, isAdmin, serviceCategoryController.updateServiceCategory);
router.delete('/:id', authenticate, isAdmin, serviceCategoryController.deleteServiceCategory);

module.exports = router;
