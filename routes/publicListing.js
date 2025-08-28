const express = require('express');
const router = express.Router();
const { getAllServices, getServiceBySlug, getAllProducts, getAllFood, getProductById} = require('../controllers/publicListing');
const { listProductsRanked } = require('../controllers/productListingController');
const attachSimilarQuery = require('../middlewares/attachSimilarQuery');


router.get('/services/list', getAllServices);

router.get('/services/:slug', getServiceBySlug);

router.get('/products/list', getAllProducts);
router.get('/product/:productId', getProductById);

// router.get('/products/:slug', getProductBySlug);

router.get('/food/list', getAllFood);

// router.get('/food/:slug', getFoodBySlug);




// GET /api/products/ranked?categoryId=&subcategoryId=&page=1&pageSize=24&maxPerVendor=3
router.get('/ranked', listProductsRanked);
router.get('/:id/similar', attachSimilarQuery , listProductsRanked)





module.exports = router;
