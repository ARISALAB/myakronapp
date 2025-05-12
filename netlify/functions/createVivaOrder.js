const fetch = require('node-fetch');
const admin = require('firebase-admin');

// ✅ Αρχικοποίηση Firebase Admin SDK (για επαλήθευση token)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // ή χρησιμοποίησε serviceAccountKey
  });
}

// 🔐 Viva Wallet credentials
const VIVA_MERCHANT_ID = "64e2f74e-d8f5-4d90-be5c-1f805fb1e41e";
const VIVA_API_KEY = "+jjNx2";
const VIVA_BASE_URL = "https://demo.vivapayments.com"; // Χρησιμοποίησε https://www.vivapayments.com για production

exports.handler = async function (event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    // ✅ Επαλήθευση Firebase ID Token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: "Απαιτείται έλεγχος ταυτότητας" };
    }

    const idToken = authHeader.split(" ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const body = JSON.parse(event.body);
    const email = body.email || decodedToken.email;
    const fullName = body.fullName || "Χρήστης";

    // 🧾 Δημιουργία Viva Wallet παραγγελίας
    const orderRes = await fetch(`${VIVA_BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${VIVA_MERCHANT_ID}:${VIVA_API_KEY}`).toString("base64"),
      },
      body: JSON.stringify({
        customerTrns: "Συνδρομή εφαρμογής",
        customer: {
          email: email,
          fullName: fullName,
        },
        amount: 500, // 5 ευρώ = 500 λεπτά
        paymentTimeout: 300,
        preauth: false,
        allowRecurring: false,
        sourceCode: "Default",
      }),
    });

    const orderData = await orderRes.json();

    if (!orderData.orderCode) {
      console.error("Σφάλμα Viva:", orderData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Αποτυχία δημιουργίας παραγγελίας" }),
      };
    }

    // 🔗 Δημιουργία Checkout URL
    const checkoutUrl = `${VIVA_BASE_URL}/web/checkout?ref=${orderData.orderCode}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl }),
    };

  } catch (error) {
    console.error("Σφάλμα:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Εσωτερικό σφάλμα διακομιστή" }),
    };
  }
};
