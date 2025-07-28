const express = require('express');
const { getAllCategories, getProductCategories,getProductSubcategories } = require('../controllers/categoryController');
const s3Controller = require('../controllers/s3Controller');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const router = express.Router();

// Route to get all categories
router.get('/categories', getAllCategories);
router.get('/getProductCategories', getProductCategories);
router.get('/subcategories/:categoryId', getProductSubcategories);
router.get("/s3-presigned-url", authenticate,isBusinessOwner, s3Controller.getPresignedUrl);


module.exports = router;
