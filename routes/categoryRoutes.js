const express = require('express');
const { getAllCategoriesAdmin,getAllCategories, getProductCategories,getProductSubcategories } = require('../controllers/categoryController');
const s3Controller = require('../controllers/s3Controller');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwnerOrAdmin = require('../middlewares/isBusinessOwnerOrAdmin');
const router = express.Router();

// Route to get all categories
router.get('/categories', getAllCategories);
router.get('/getProductCategories', getProductCategories);
router.get('/subcategories/:categoryId', getProductSubcategories);
router.get("/s3-presigned-url", authenticate,isBusinessOwnerOrAdmin, s3Controller.getPresignedUrl);
router.get('/admin/categories', getAllCategoriesAdmin);


module.exports = router;
