const express = require('express');
const { handleStripeWebhook } = require('../controllers/webhookController');
const webhookRouter = express.Router();

// Webhook to listen for Stripe events
webhookRouter.post('/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = webhookRouter;
