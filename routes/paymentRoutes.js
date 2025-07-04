const express = require('express');
const rateLimit = require('express-rate-limit');
const { createPaymentIntent, handleStripeWebhook } = require('../controllers/paymentController');
const { body } = require('express-validator');


const paymentRouter = express.Router();

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP, please try again later.',
});


paymentRouter.post(
  '/create-payment-intent',
  paymentLimiter,
  [
    body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
    body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency code must be 3 characters'),
    body('paymentMethodId').notEmpty().withMessage('Payment method is required'),
    body('orderId').isMongoId().withMessage('Invalid Order ID format'),
  ],
  createPaymentIntent
);

// Webhook route to handle Stripe events
paymentRouter.post('/stripe-webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = paymentRouter;
