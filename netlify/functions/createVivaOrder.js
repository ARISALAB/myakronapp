const functions = require('@netlify/functions');
const fetch = require('node-fetch');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// 🔐 Αντικατάστησε με το δικό σου serviceAccount JSON (ή χρησιμοποίησε περιβαλλοντικές μεταβλητές)
const serviceAccount = {
  "type": "service_account",
  "project_id": "restaurantfinanceapp",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
};

initializeApp({ credential: cert(serviceAccount) });

exports.handler = functions.handler(async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const authHeader = event.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!idToken) {
    return {
      statusCode: 401,
      body: 'Missing or invalid token'
    };
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    const body = JSON.parse(event.body);
    const fullName = body.fullName || decoded.name || 'Customer';
    const email = body.email || decoded.email;

    // 👉 Δημιουργία Viva Wallet παραγγελίας
    const response = await fetch('https://demo.vivapayments.com/api/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${process.env.VIVA_MERCHANT_ID}:${process.env.VIVA_API_KEY}`).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: 500, // 5 ευρώ σε λεπτά
        customerTrns: 'Αγορά Εφαρμογής',
        customer: {
          email: email,
          fullName: fullName
        },
        paymentTimeout: 300,
        preauth: false
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Viva Error:', data);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Viva order failed' })
      };
    }

    const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${data.orderCode}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl })
    };
  } catch (err) {
    console.error('Error verifying token or creating order:', err);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
});
