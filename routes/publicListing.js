const express = require('express');
const router = express.Router();
const { getAllServices, getServiceBySlug, getAllProducts, getAllFood, getProductById} = require('../controllers/publicListing');

router.get('/services/list', getAllServices);

router.get('/services/:slug', getServiceBySlug);

router.get('/products/list', getAllProducts);
router.get('/product/:productId', getProductById);

// router.get('/products/:slug', getProductBySlug);

router.get('/food/list', getAllFood);

// router.get('/food/:slug', getFoodBySlug);


module.exports = router;
