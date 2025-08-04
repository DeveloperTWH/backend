const express = require('express');
const router = express.Router();
const { initiateOrder, getUserOrders, getVendorOrders, acceptOrder, rejectOrder, shipOrder } = require('../controllers/orderController');
const { retrieveIntent } = require('../controllers/stripePaymentController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner')



router.post('/initiate', authenticate, initiateOrder);
router.get('/retrieve-intent/:id', authenticate, retrieveIntent);
router.get('/user', authenticate, getUserOrders);
router.get('/vendor', authenticate, isBusinessOwner, getVendorOrders);
router.put('/accept/:orderId', authenticate, isBusinessOwner, acceptOrder);
router.put('/reject/:orderId', authenticate, isBusinessOwner, rejectOrder);
router.put('/ship/:orderId', authenticate, isBusinessOwner, shipOrder);




module.exports = router;
