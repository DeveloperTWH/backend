const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');
const webhookRouter = express.Router();

// Canonical Stripe webhook endpoint for order-payment events
webhookRouter.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = webhookRouter;
