const express = require('express');
const router = express.Router();
const stripeController = require('../controllers/stripeController');
const authenticate = require('../middlewares/authenticate');
const isBusinessOwner = require('../middlewares/isBusinessOwner');

router.post('/webhook', express.raw({ type: 'application/json' }), stripeController.handleStripeWebhook);

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session',express.json() ,authenticate, isBusinessOwner, stripeController.createCheckoutSession);



module.exports = router;
