const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');
const { stripePaymentWebhook } = require('../controllers/stripePaymentController');

router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.handleStripeWebhook);
router.post('/payment/webhook', express.raw({ type: 'application/json' }), stripePaymentWebhook);

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session',express.json() ,authenticate, isBusinessOwner, stripeController.createCheckoutSession);



module.exports = router;
