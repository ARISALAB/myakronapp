// functions/create-viva-order.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Λαμβάνουμε το token από το πρώτο endpoint (get-viva-token)
  const tokenResponse = await fetch('https://myakronapp.netlify.app/.netlify/functions/get-viva-token');
  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Δεν λήφθηκε έγκυρο token' })
    };
  }

  const url = 'https://demo-api.vivapayments.com/checkout/v2/orders';
  const orderData = {
    amount: 1000, // Η αξία της παραγγελίας σε λεπτά (π.χ. 10,00€ είναι 1000)
    currency: 'EUR',
    orderOptions: {
      redirectUrl: 'https://your-redirect-url.com',
      cancelUrl: 'https://your-cancel-url.com'
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();
    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(data)
      };
    }

    // Επιστρέφουμε την URL για το checkout
    return {
      statusCode: 200,
      body: JSON.stringify({ checkout_url: data.checkoutUrl })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
