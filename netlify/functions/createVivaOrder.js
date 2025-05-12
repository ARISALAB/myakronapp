const fetch = require('node-fetch');
const admin = require('firebase-admin');

// Viva Wallet config
const VIVA_API_KEY = '+jjNx2'; // Βάλε εδώ το δικό σου API Key
const VIVA_MERCHANT_ID = '64e2f74e-d8f5-4d90-be5c-1f805fb1e41e';
const VIVA_ENV = 'https://www.vivapayments.com'; // ή 'https://demo.vivapayments.com' για δοκιμές

// Firebase Admin Init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);

    // 1. Επαλήθευση Firebase ID Token
    const authHeader = event.headers.authorization || '';
    const idToken = authHeader.replace('Bearer ', '');

    if (!idToken) {
      return { statusCode: 401, body: 'Missing ID token' };
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;
    const fullName = body.fullName || decodedToken.name || 'Χρήστης';

    // 2. Δημιουργία Viva Order
    const orderRequest = {
      amount: 500, // σε λεπτά του ευρώ (π.χ. 500 = 5€)
      customer: {
        email: email,
        fullName: fullName
      },
      merchantTrns: 'Συνδρομή Εφαρμογής',
      sourceCode: 'Default',
    };

    const response = await fetch(`${VIVA_ENV}/api/orders`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${VIVA_MERCHANT_ID}:${VIVA_API_KEY}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderRequest)
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: 500, body: `Viva API Error: ${err}` };
    }

    const orderData = await response.json();

    // 3. Επιστροφή Checkout URL
    const checkoutUrl = `${VIVA_ENV}/web/checkout?ref=${orderData.orderCode}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `Server error: ${error.message}`
    };
  }
};
