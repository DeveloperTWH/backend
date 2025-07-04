const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Function to process payment
const processPayment = async (paymentDetails) => {
  const { amount, currency, paymentMethodId } = paymentDetails;

  try {
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency: currency,
      payment_method: paymentMethodId,
      confirm: true,
    });

    // Return success if payment is successful
    return paymentIntent.status === 'succeeded' ? 'success' : 'failed';
  } catch (error) {
    console.error(error);
    return 'failed';
  }
};

module.exports = { processPayment };
