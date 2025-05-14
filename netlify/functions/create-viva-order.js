const fetch = require('node-fetch');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Αντικατάστησε με τα δικά σου .env μεταβλητά
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;
const VIVA_BASE_URL = 'https://api.vivapayments.com'; // production. Για demo: https://demo.vivapayments.com
const FIREBASE_SERVICE_ACCOUNT = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

let db;
if (!getFirestore.apps?.length) {
  initializeApp({ credential: cert(FIREBASE_SERVICE_ACCOUNT) });
  db = getFirestore();
}

exports.handler = async function(event, context) {
  console.log("Requesting Viva Wallet token...");

  try {
    // 1. Ζήτα το access token από Viva
    const tokenResponse = await fetch(`${VIVA_BASE_URL}/connect/token`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials'
        // ΜΗΝ περιλαμβάνεις scope αν σου δίνει σφάλμα
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Viva Token Error:", tokenResponse.status, tokenData);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${JSON.stringify(tokenData)}` })
      };
    }

    const accessToken = tokenData.access_token;

    // 2. Δημιούργησε την παραγγελία
    const orderPayload = {
      amount: 500, // π.χ. 5 ευρώ
      customer: {
        email: "test@example.com" // μπορεί να πάρει και από event.body
      }
    };

    const orderResponse = await fetch(`${VIVA_BASE_URL}/checkout/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("Viva Order Creation Error:", orderResponse.status, orderData);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Failed to create Viva order: ${JSON.stringify(orderData)}` })
      };
    }

    // 3. Αποθήκευσε στο Firestore (προαιρετικά)
    await db.collection('viva_orders').add({
      orderCode: orderData.orderCode,
      amount: orderPayload.amount,
      email: orderPayload.customer.email,
      timestamp: new Date()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderCode: orderData.orderCode,
        checkoutUrl: orderData.checkoutUrl
      })
    };
  } catch (error) {
    console.error("Unexpected Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
