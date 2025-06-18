const axios = require('axios');

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const { data } = await axios.post(
      'https://api-m.paypal.com/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return data.access_token;
  } catch (error) {
    console.error('PayPal Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get PayPal access token');
  }
}

async function verifyPayPalPayment(paymentId, expectedPayerId) {
  try {
    const token = await getPayPalAccessToken();

    const { data } = await axios.get(
      `https://api-m.paypal.com/v2/checkout/orders/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return (
      data.status === 'COMPLETED' &&
      data.payer?.payer_id === expectedPayerId
    );
  } catch (error) {
    console.error('PayPal Verification Error:', error.response?.data || error.message);
    return false;
  }
}

module.exports = {
  verifyPayPalPayment,
};
