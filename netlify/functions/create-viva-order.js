// Απαιτεί την εγκατάσταση της βιβλιοθήκης: npm install firebase-admin
const admin = require('firebase-admin');
const fetch = require('node-fetch'); // Ίσως χρειαστεί npm install node-fetch@2.6.7 αν έχεις θέμα με fetch σε Netlify

// Αντικατάστησε με τις δικές σου μεταβλητές από το Netlify Environment Variables
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;
// Βεβαιώσου ότι αυτές οι URLs είναι σωστές για το περιβάλλον σου (production vs demo)
const VIVA_TOKEN_URL = 'https://accounts.vivapayments.com/connect/token';
const VIVA_ORDERS_URL = 'https://api.vivapayments.com/checkout/v2/orders';
const VIVA_CHECKOUT_BASE_URL = 'https://www.vivapayments.com/web/checkout/';

// Οι URLs επιστροφής μετά την πληρωμή. Πρέπει να ταιριάζουν με τις ρυθμίσεις στο Viva Wallet portal.
const NETLIFY_SITE_URL = process.env.URL || process.env.NETLIFY_URL;
const SUCCESS_URL = `${NETLIFY_SITE_URL}/payment-success`;
const FAILURE_URL = `${NETLIFY_SITE_URL}/payment-failure`;
const CANCEL_URL = `${NETLIFY_SITE_URL}/payment-cancelled`;
// Πρόσθεσε και το Webhook URL αν το έχεις ρυθμίσει
// const WEBHOOK_URL = `${NETLIFY_SITE_URL}/.netlify/functions/viva-webhook`;


// --- Αρχικοποίηση Firebase Admin SDK (εκτός handler για warm starts) ---
// ΠΡΕΠΕΙ να γίνει ΜΟΝΟ μία φορά.
let db; // Κρατάμε αναφορά στο Firestore
// Αν χρειάζεσαι Admin Auth:
// let authAdmin;

// Χρησιμοποιούμε admin.apps.length για να ελέγξουμε αν έχει αρχικοποιηθεί.
// Αυτή η ιδιότητα υπάρχει στο κύριο αντικείμενο admin.
if (!admin.apps.length) {
    try {
        // Διαβάζουμε και κάνουμε parse το JSON string του Service Account Key
        // από την environment variable.
        // Χρησιμοποιούμε το όνομα που φαίνεται να είναι σωστό πλέον: FIREBASE_SERVICE_ACCOUNT
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Αρχικοποίηση του Admin SDK με τα credentials.
        // Χρησιμοποιούμε admin.credential.cert() και admin.initializeApp() από το κύριο αντικείμενο admin.
        admin.initializeApp({
             credential: admin.credential.cert(serviceAccountJson), // Χρησιμοποιούμε admin.credential.cert()
             // Αν χρησιμοποιείς Realtime Database, πρόσθεσε το databaseURL εδώ:
             // databaseURL: "https://YOUR-REALTIME-DATABASE-NAME.firebaseio.com"
        });

        // Παίρνουμε την αναφορά για το Firestore από το κύριο αντικείμενο admin
        db = admin.firestore();
        // Αν χρειάζεσαι Admin Auth:
        // authAdmin = admin.auth();

        console.log('✅ Firebase Admin Initialized successfully (create-viva-order).');

    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin (create-viva-order):', error);
        // Αν η αρχικοποίηση αποτύχει, η function δεν μπορεί να δουλέψει σωστά.
        // Ρίχνουμε ένα σφάλμα για να το δεις στα logs.
        throw new Error('Firebase Admin Initialization Error (create-viva-order): ' + error.message);
    }
} else {
     // Αν το app έχει ήδη αρχικοποιηθεί (warm start), παίρνουμε την υπάρχουσα instance.
     // Δεν χρειάζεται να την ξανα-αρχικοποιήσουμε.
     // Παίρνουμε απλώς τις αναφορές στις υπηρεσίες.
     db = admin.firestore();
     // Αν χρειάζεσες Admin Auth:
     // authAdmin = admin.auth();
    console.log('ℹ️ Firebase Admin already initialized (create-viva-order).');
}
// --- Τέλος Αρχικοποίησης Firebase Admin SDK ---


// Ο κύριος handler της Netlify Function.
exports.handler = async function(event, context) {
  // CORS headers (πρέπει να τα επιστρέφουν ΟΛΕΣ οι απαντήσεις)
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*', // Σε production, βάλε το domain σου
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS' // Επιτρέπουμε POST και OPTIONS (για preflight requests)
  };

  // Χειρισμός CORS preflight requests (OPTIONS method)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers // Επιστρέφουμε μόνο τα headers
    };
  }


  // Έλεγχος HTTP Method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Method Not Allowed, only POST is accepted.' }),
      headers
    };
  }

  // Έλεγχος Viva Wallet credentials
  if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
    console.error('❌ Viva Wallet credentials not set in environment variables!');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error (Viva Wallet credentials missing)' }),
      headers
    };
  }

  // Διαβάζουμε και επικυρώνουμε το request body από τον frontend
  let requestBody;
  try {
    // event.body είναι string, πρέπει να το κάνουμε parse
    requestBody = JSON.parse(event.body);
    // Βασική επικύρωση των απαραίτητων πεδίων
    if (!requestBody.userId || requestBody.amount === undefined || requestBody.amount === null || requestBody.amount <= 0) {
      console.error('❌ Validation Error: Missing or invalid userId or amount', requestBody);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing or invalid userId or amount in request body' }),
        headers
      };
    }
  } catch (parseError) {
    console.error('❌ Failed to parse request body:', parseError);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' }),
      headers
    };
  }

  // --- Κύρια Λογική Viva Wallet Process ---
  try {
    // === 1. Ζήτα το access token από Viva Wallet ===
    // Αυτό απαιτεί Basic Authentication με Client ID και Client Secret.
    const authString = `${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`;
    const base64AuthString = Buffer.from(authString).toString('base64');

    console.log('Requesting Viva Wallet token...');

    const tokenResponse = await fetch(VIVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // Αυτό το endpoint περιμένει form data
        'Authorization': `Basic ${base64AuthString}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials', // Ζητάμε token για την ίδια την εφαρμογή (όχι για χρήστη)
        scope: 'payments' // <-- ΕΠΑΝΑΦΕΡΑΜΕ ΤΟ ΣΩΣΤΟ SCOPE
      })
    });

    // Ελέγχουμε την απάντηση για σφάλματα
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('❌ Viva Token Error:', tokenResponse.status, errorBody);
      return {
        statusCode: tokenResponse.status, // Επιστρέφουμε τον κωδικό σφάλματος της Viva Wallet
        body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${errorBody}` }),
        headers
      };
    }

    // Παίρνουμε το access token από την επιτυχή απάντηση
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ Successfully obtained Viva Wallet token.');

    // === 2. Δημιούργησε την παραγγελία στη Viva Wallet ===
    // Ετοιμάζουμε το payload για τη δημιουργία παραγγελίας
    const orderDetails = {
      amount: Math.round(requestBody.amount * 100), // Το ποσό πρέπει να είναι σε μικρότερη μονάδα (π.χ. cents)
      currencyCode: 'EUR', // Βάλε το σωστό νόμισμα
      customerTrns: requestBody.userId, // Κάποιο αναγνωριστικό για τον πελάτη στην παραγγελία Viva
      customer: {
        email: requestBody.email || 'anonymous@example.com', // Πάρε email από frontend αν στέλνεις
        customerReference: requestBody.userId // Αναφορά πελάτη για Viva
      },
      clientReference: `order-${Date.now()}-${requestBody.userId}`, // Μοναδικό ID για την παραγγελία σου
      description: requestBody.description || 'Πρόσβαση στην Εφαρμογή', // Περιγραφή παραγγελίας
      callbackUrls: {
        successUrl: SUCCESS_URL, // URLs επιστροφής μετά την πληρωμή
        failureUrl: FAILURE_URL,
        cancelUrl: CANCEL_URL
        // Βάλε και το Webhook URL εδώ αν χρησιμοποιείς webhooks (συνιστάται για επιβεβαίωση!)
        // webhook: WEBHOOK_URL
      }
    };

    console.log('Creating Viva Wallet order with details:', JSON.stringify(orderDetails));

    // Κάνουμε POST request στο endpoint δημιουργίας παραγγελιών
    const orderResponse = await fetch(VIVA_ORDERS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json', // Αυτό το endpoint περιμένει JSON
        'Authorization': `Bearer ${accessToken}` // Χρησιμοποιούμε το token που πήραμε
      },
      body: JSON.stringify(orderDetails) // Στέλνουμε τα στοιχεία παραγγελίας ως JSON
    });

    // Ελέγχουμε την απάντηση για σφάλματα
    if (!orderResponse.ok) {
      const errorBody = await orderResponse.text();
      console.error('❌ Viva Order Creation Error:', orderResponse.status, errorBody);
      return {
        statusCode: orderResponse.status, // Επιστρέφουμε τον κωδικό σφάλματος της Viva Wallet
        body: JSON.stringify({ error: `Failed to create Viva Wallet order: ${errorBody}` }),
        headers
      };
    }

    // Παίρνουμε τα στοιχεία της δημιουργημένης παραγγελίας
    const orderData = await orderResponse.json();
    const orderCode = orderData.order.orderCode;
    // Κατασκευάζουμε το URL ανακατεύθυνσης προς τη σελίδα πληρωμής της Viva Wallet
    const checkoutUrl = `${VIVA_CHECKOUT_BASE_URL}${orderCode}`;

    console.log('✅ Successfully created Viva Wallet order. Checkout URL:', checkoutUrl);

    // === 3. Αποθήκευση στο Firestore (Συνιστάται για παρακολούθηση) ===
    // Χρησιμοποιούμε το db instance που πήραμε κατά την αρχικοποίηση
    try {
      await db.collection('viva_orders').add({
        userId: requestBody.userId, // Αποθηκεύουμε το User ID για σύνδεση με τον χρήστη
        orderCode: orderCode,
        amount: orderDetails.amount, // Αποθηκεύουμε το ποσό σε cents
        currency: orderDetails.currencyCode,
        description: orderDetails.description,
        customerEmail: orderDetails.customer.email,
        clientReference: orderDetails.clientReference,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Timestamp δημιουργίας
        status: 'created' // Αρχική κατάσταση (θα ενημερωθεί από webhook)
      });
      console.log(`✅ Saved Viva order ${orderCode} to Firestore for user ${requestBody.userId}.`);
    } catch (dbError) {
      console.error(`❌ Failed to save Viva order ${orderCode} to Firestore:`, dbError);
      // Δεν πετάμε σφάλμα 500 στον χρήστη αν αποτύχει μόνο η αποθήκευση,
      // αφού η παραγγελία στη Viva δημιουργήθηκε. Αλλά το καταγράφουμε.
    }


    // === 4. Επιστροφή του Checkout URL στον Frontend ===
    // Επιστρέφουμε το URL της σελίδας πληρωμής της Viva Wallet
    return {
      statusCode: 200, // OK - Η παραγγελία δημιουργήθηκε
      body: JSON.stringify({ checkoutUrl: checkoutUrl }), // Επιστρέφουμε το URL
      headers
    };

  } catch (error) {
    // === 5. Χειρισμός Απρόβλεπτων Σφαλμάτων ===
    // Πιάνει τυχόν σφάλματα που δεν πιάστηκαν στα προηγούμενα βήματα (π.χ. σφάλμα fetch, parsing).
    console.error('❌ Unexpected Error during Viva Wallet order process:', error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }),
      headers
    };
  }
};
