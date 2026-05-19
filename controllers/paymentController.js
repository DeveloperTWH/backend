const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Stripe secret key
const { validationResult } = require('express-validator');

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
      amount: amount * 100,
      currency,
      // payment_method: paymentMethodId,
      // confirm: true,
      metadata: { orderId },
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always',
      },
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

module.exports = {
  createPaymentIntent,
};
