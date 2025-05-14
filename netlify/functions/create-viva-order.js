// netlify/functions/create-viva-order.js

const fetch = require('node-fetch');

// Περιβάλλοντα Viva Wallet (PRODUCTION)
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;
const VIVA_TOKEN_URL = 'https://accounts.vivapayments.com/connect/token';
const VIVA_ORDERS_URL = 'https://api.vivapayments.com/checkout/v2/orders';
const VIVA_CHECKOUT_BASE_URL = 'https://www.vivapayments.com/web/checkout/';

const NETLIFY_SITE_URL = process.env.NETLIFY_URL || process.env.URL;
const SUCCESS_URL = NETLIFY_SITE_URL + '/payment-success';
const FAILURE_URL = NETLIFY_SITE_URL + '/payment-failure';
const CANCEL_URL = NETLIFY_SITE_URL + '/payment-cancelled';

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' }
    };
  }

  if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
    console.error('Viva Wallet credentials not set in environment variables!');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error (Viva Wallet credentials missing)' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
    if (!requestBody.userId || requestBody.amount === undefined || requestBody.amount === null || requestBody.amount <= 0) {
      console.error('Validation Error: Missing or invalid userId or amount', requestBody);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid userId or amount in request body' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  try {
    const authString = `${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`;
    const base64AuthString = Buffer.from(authString).toString('base64');

    console.log('Requesting Viva Wallet token...');

    const tokenResponse = await fetch(VIVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${base64AuthString}`
      },
      body: new URLSearchParams({
        'grant_type': 'client_credentials',
        'scope': 'payments orders'
      })
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Viva Token Error:', tokenResponse.status, errorBody);
      return {
        statusCode: tokenResponse.status,
        body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${errorBody}` }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('Successfully obtained Viva Wallet token.');

    const orderDetails = {
      amount: Math.round(requestBody.amount * 100),
      currencyCode: 'EUR',
      customerTrns: requestBody.userId,
      customer: {
        customerReference: requestBody.userId
      },
      clientReference: `order-${Date.now()}-${requestBody.userId}`,
      description: requestBody.description || 'Εφαρμογή Πληρωμής',
      callbackUrls: {
        successUrl: SUCCESS_URL,
        failureUrl: FAILURE_URL,
        cancelUrl: CANCEL_URL
        // webhook: 'https://your-site.netlify.app/.netlify/functions/viva-webhook'
      }
    };

    console.log('Creating Viva Wallet order with details:', JSON.stringify(orderDetails));

    const orderResponse = await fetch(VIVA_ORDERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderDetails)
    });

    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error('Viva Order Creation Error:', orderResponse.status, errorBody);
      return {
        statusCode: orderResponse.status,
        body: JSON.stringify({ error: `Failed to create Viva Wallet order: ${errorBody}` }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const orderData = await orderResponse.json();
    const orderCode = orderData.order.orderCode;
    const checkoutUrl = `${VIVA_CHECKOUT_BASE_URL}${orderCode}`;

    console.log('Successfully created Viva Wallet order. Checkout URL:', checkoutUrl);

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error('Server error during Viva Wallet order process:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Internal server error: ${error.message}` }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
