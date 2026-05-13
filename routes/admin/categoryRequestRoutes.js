const express = require('express');
const {
  getAllCategoryRequests,
  approveCategoryRequest,
  rejectCategoryRequest,
} = require('../../controllers/categoryController');
const authenticate = require('../../middlewares/authenticate');
const isAdmin = require('../../middlewares/isAdmin');

const router = express.Router();

router.use(authenticate, isAdmin);

router.get('/', getAllCategoryRequests);
router.put('/:id/approve', approveCategoryRequest);
router.put('/:id/reject', rejectCategoryRequest);

module.exports = router;
