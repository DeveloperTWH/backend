const Stripe = require('stripe');
const Order = require('../models/Order');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.stripePaymentWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_TWO
    );
  } catch (err) {
    console.error('❌ Stripe webhook signature invalid:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const paymentId = paymentIntent.id;

      const orders = await Order.find({ paymentId });

      if (!orders.length) {
        console.warn(`⚠️ No orders found for paymentId ${paymentId}`);
        return res.status(200).json({ received: true });
      }

      for (const order of orders) {
        order.paymentStatus = 'paid';
        if (order.status === 'created') {
          order.status = 'ordered';
          order.statusHistory.push({ status: 'ordered' });
        }
        await order.save();
      }

      console.log(`✅ Stripe payment confirmed for ${orders.length} order(s)`);
    }

    res.json({ received: true });

  } catch (err) {
    console.error('⚠️ Webhook handler error:', err);
    return res.status(500).send('Webhook handler failed');
  }
};



// ✅ Retrieve payment intent details
exports.retrieveIntent = async (req, res) => {
  const { id } = req.params;

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(id);

    const orders = await Order.find({ paymentId: id }).populate({
      path: 'items.productId',
      select: 'title coverImage', // optional, you can add more fields
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found for this payment' });
    }

    return res.status(200).json({
      success: true,
      paymentIntent,
      orders,
    });
  } catch (error) {
    console.error('❌ Failed to retrieve payment intent:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment information',
      error: error.message,
    });
  }
};

