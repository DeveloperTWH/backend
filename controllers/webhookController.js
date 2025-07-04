const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

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

  // Handle the event based on its type
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      const orderId = paymentIntent.metadata.orderId;

      // Update order status to 'paid' and 'completed'
      try {
        await Order.findByIdAndUpdate(orderId, { 
          paymentStatus: 'paid', 
          orderStatus: 'completed' 
        });
        console.log(`Order ${orderId} payment succeeded.`);
      } catch (error) {
        console.error(`Failed to update order ${orderId} after payment success:`, error);
        return res.status(500).send('Failed to update order status');
      }
      
      res.status(200).send({ received: true });
      break;

    case 'payment_intent.payment_failed':
      const failedPaymentIntent = event.data.object;
      const failedOrderId = failedPaymentIntent.metadata.orderId;

      // Update order status to 'failed'
      try {
        await Order.findByIdAndUpdate(failedOrderId, { 
          paymentStatus: 'failed', 
          orderStatus: 'failed' 
        });
        console.log(`Order ${failedOrderId} payment failed.`);
      } catch (error) {
        console.error(`Failed to update order ${failedOrderId} after payment failure:`, error);
        return res.status(500).send('Failed to update order status');
      }

      res.status(200).send({ received: true });
      break;

    // Handle additional events, for example, 'payment_intent.requires_action'
    case 'payment_intent.requires_action':
      const requiresActionPaymentIntent = event.data.object;
      const actionOrderId = requiresActionPaymentIntent.metadata.orderId;

      console.log(`Payment intent requires further action for order ${actionOrderId}.`);
      res.status(200).send({ received: true });
      break;

    // Handle charge refunded event
    case 'charge.refunded':
      const chargeRefunded = event.data.object;
      const refundedOrderId = chargeRefunded.metadata.orderId;

      // Update order status to refunded
      try {
        await Order.findByIdAndUpdate(refundedOrderId, { 
          paymentStatus: 'refunded', 
          orderStatus: 'refunded' 
        });
        console.log(`Order ${refundedOrderId} refunded.`);
      } catch (error) {
        console.error(`Failed to update order ${refundedOrderId} after refund:`, error);
        return res.status(500).send('Failed to update order status');
      }

      res.status(200).send({ received: true });
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
      res.status(200).send({ received: true });
  }
};

module.exports = { handleStripeWebhook };
