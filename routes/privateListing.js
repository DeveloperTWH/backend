const express = require('express');
const router = express.Router();


const { getAllPrivateServicesForBusiness, getServiceBySlug, getAllProducts, getAllFood } = require('../controllers/privateListing');

const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

// Route to fetch all private services for a business
router.get('/services/list', authenticate, isBusinessOwner, getAllPrivateServicesForBusiness);

// Route to fetch a service by slug (only if the user is the business owner)
router.get('/services/:slug', authenticate, isBusinessOwner, getServiceBySlug);

router.get('/food/list', authenticate, isBusinessOwner, getAllFood);
router.get('/products/list', authenticate, isBusinessOwner, getAllProducts);

module.exports = router;
