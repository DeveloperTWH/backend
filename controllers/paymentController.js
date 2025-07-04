const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe secret key
const { validationResult } = require('express-validator');
const Order = require('../models/Order');

// Create Payment Intent
const createPaymentIntent = async (req, res) => {
  // Validate inputs
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, currency, paymentMethodId, orderId } = req.body;

  try {
    // Create payment intent with Stripe API
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency: currency,
      payment_method: paymentMethodId,
      confirm: true, // Automatically confirm the payment
      metadata: { orderId }, // Attach the orderId to the payment intent
    });

    // Send the client secret to the frontend to complete the payment
    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe payment intent creation failed:', error);

    // Specific error handling based on the Stripe error type
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ message: 'Card error: ' + error.message });
    }
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ message: 'Invalid request: ' + error.message });
    }

    res.status(500).json({ message: 'Payment creation failed. Please try again later.' });
  }
};

// Webhook to handle Stripe events (like successful payments)
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const payload = req.body;
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

  let event;

  try {
    // Verify the webhook signature to ensure the event is from Stripe
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different types of events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      // Update the order status in your database
      try {
        await Order.findByIdAndUpdate(orderId, {
          paymentStatus: 'paid',
          orderStatus: 'completed',
        });
        console.log(`Order ${orderId} payment succeeded.`);
      } catch (error) {
        console.error('Failed to update order status:', error);
        return res.status(500).send('Failed to update order status');
      }

      res.status(200).send({ received: true });
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      const failedOrderId = failedPaymentIntent.metadata.orderId;

      // Update the order status to failed
      try {
        await Order.findByIdAndUpdate(failedOrderId, {
          paymentStatus: 'failed',
          orderStatus: 'failed',
        });
        console.log(`Order ${failedOrderId} payment failed.`);
      } catch (error) {
        console.error('Failed to update order status:', error);
        return res.status(500).send('Failed to update order status');
      }

      res.status(200).send({ received: true });
      break;

    // You can handle other Stripe events here, such as `payment_intent.created`, `payment_intent.canceled`, etc.
    default:
      console.log(`Unhandled event type: ${event.type}`);
      res.status(200).send({ received: true });
  }
};

module.exports = {
  createPaymentIntent,
  handleStripeWebhook,
};
