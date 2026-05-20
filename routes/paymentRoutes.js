const express = require('express');
const rateLimit = require('express-rate-limit');
const { createPaymentIntent } = require('../controllers/paymentController');
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
    body('orderId').isMongoId().withMessage('Invalid Order ID format'),
    body('amount').optional().isNumeric().withMessage('Amount must be numeric when provided'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency code must be 3 characters when provided'),
  ],
  createPaymentIntent
);

module.exports = paymentRouter;
