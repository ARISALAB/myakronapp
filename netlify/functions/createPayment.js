// netlify/functions/createPayment.js
const axios = require("axios");
const admin = require('firebase-admin'); // Χρειάζεται για την αρχικοποίηση της Admin SDK

// Αρχικοποίηση Firebase Admin SDK για πρόσβαση στη DB (κοινό σε όλες τις functions που την χρειάζονται)
// Αυτό το block εκτελείται μία φορά κατά το "cold start" της function
if (!admin.apps || admin.apps.length === 0) { // Έλεγχος αν έχει ήδη αρχικοποιηθεί
  try {
    // Βεβαιώσου ότι η Environment Variable FIREBASE_SERVICE_ACCOUNT_KEY είναι σωστή JSON string
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Αν θες να ορίσεις Project ID μέσω κώδικα και όχι μόνο μεταβλητή, πρόσθεσέ το εδώ:
      // projectId: process.env.FIREBASE_PROJECT_ID,
      // Εάν χρησιμοποιείς Realtime Database, πρόσθεσε και την databaseURL
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    console.log("Firebase Admin SDK initialized successfully in createPayment.");
  } catch (e) {
    console.error("Failed to initialize Firebase Admin in createPayment:", e);
    // Η function θα αποτύχει αν δεν αρχικοποιηθεί η Admin SDK.
    // Το Netlify θα το πιάσει ως Uncaught Exception ή θα επιστρέψει 500/502.
  }
}
// Μπορείς να ορίσεις τη βάση δεδομένων εδώ, αν η αρχικοποίηση πέτυχε
// const db = admin.firestore(); // Ή admin.database()


// ΔΕΝ ΒΑΖΕΙΣ ΤΑ ΠΡΑΓΜΑΤΙΚΑ IDs ΕΔΩ!
// Αυτά διαβάζουν τα IDs από τις Environment Variables του Netlify.
const clientId = process.env.VIVA_CLIENT_ID;
const clientSecret = process.env.VIVA_CLIENT_SECRET;

// Επιλέγει τις URLs ανάλογα με το περιβάλλον (production ή development/testing)
// Βεβαιώσου ότι έχεις ρυθμίσει την Environment Variable NODE_ENV στο Netlify (π.χ. 'production' ή 'development').
const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.vivapayments.com' // Production URL
    : 'https://demo.vivapayments.com'; // Demo/Sandbox URL (Για δοκιμές)
const accountsUrl = process.env.NODE_ENV === 'production'
    ? 'https://accounts.vivapayments.com/connect/token' // Production URL
    : 'https://demoaccounts.vivapayments.com/connect/token'; // Demo/Sandbox URL

// Οι URL στις οποίες η Viva Wallet θα ανακατευθύνει τον χρήστη ή θα στείλει ειδοποίηση.
// ΑΝΤΙΚΑΤΑΣΤΗΣΕ ΤΟ 'myakronapp.netlify.app' με το πραγματικό domain της εφαρμογής σου στο Netlify!
const YOUR_APP_DOMAIN = 'myakronapp.netlify.app'; // <--- ΑΝΤΙΚΑΤΑΣΤΗΣΕ ΜΕ ΤΟ ΔΙΚΟ ΣΟΥ DOMAIN!

const successUrl = `https://${YOUR_APP_DOMAIN}/?payment_status=success`; // Ανακατεύθυνση πίσω στην αρχική σελίδα με success status
const failureUrl = `https://${YOUR_APP_DOMAIN}/?payment_status=failed`; // Ανακατεύθυνση πίσω στην αρχική σελίδα με failed status
const sourceUrl = `https://${YOUR_APP_DOMAIN}/.netlify/functions/paymentWebhook`; // Server-to-server notification (ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ ΓΙΑ ΤΗΝ ΑΣΦΑΛΕΙΑ)


exports.handler = async function (event, context) {
    // Έλεγχος αν η Admin SDK αρχικοποιήθηκε σωστά (προαιρετικό, αλλά καλό για debug)
    if (!admin.apps || admin.apps.length === 0) {
        console.error("Firebase Admin SDK was not initialized before handler execution.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server initialization error" }) };
    }
     // Ορισμός Firestore ή Realtime DB instance αν χρειάζεται εδώ ή παραπάνω
    // const db = admin.firestore();


    if (event.httpMethod !== "POST") {
        console.warn(`Method Not Allowed: ${event.httpMethod}`);
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Λαμβάνει τα στοιχεία από το frontend
    let body;
    try {
       body = JSON.parse(event.body);
    } catch (e) {
       console.error("Failed to parse request body:", e);
       return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }
    const { uid, email, amount } = body;


    // Έλεγχος για απαραίτητα στοιχεία
    if (!uid || !email || !amount || typeof amount !== 'number' || amount <= 0) {
        console.error("Missing or invalid required payment data:", { uid, email, amount });
        return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid payment data" }) };
    }

    try {
        // ----------- Debugging Log ---------------
        // Αυτό το log θα εμφανιστεί στα Function logs για να επιβεβαιώσουμε την URL
        console.log("Attempting to obtain Viva Wallet access token from URL:", accountsUrl);
        // -----------------------------------------


        // 1. Απόκτηση access token από τη Viva Wallet
        const tokenResponse = await axios.post(
            accountsUrl, // Χρησιμοποιείται εδώ
            new URLSearchParams({
                grant_type: "client_credentials",
                client_id: clientId,
                client_secret: clientSecret,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const accessToken = tokenResponse.data.access_token;
        console.log("Successfully obtained Viva Wallet access token."); // Logging επιτυχίας


        // 2. Δημιουργία πληρωμής (payment order) στη Viva Wallet
        // Χρησιμοποιούμε το baseUrl + /checkout/v2/orders
        const createOrderUrl = `${baseUrl}/checkout/v2/orders`;
        console.log("Attempting to create order at URL:", createOrderUrl); // Logging της URL για δημιουργία παραγγελίας

        const paymentResponse = await axios.post(
            createOrderUrl, // Χρησιμοποιείται εδώ
            {
                amount: amount, // Ποσό σε λεπτά (1000 = 10.00 Ευρώ) - Βεβαιώσου ότι είναι το σωστό ποσό
                customer: { // Προσθήκη στοιχείων πελάτη (καλό για logging στη Viva)
                   email: email,
                   customerText: `Firebase UID: ${uid}` // Αποθήκευση του UID για εύκολη αναγνώριση στο webhook
                },
                // Ορισμός των URL επιστροφής/ειδοποίησης
                callbackUrls: {
                   success: successUrl,
                   failure: failureUrl,
                   source: sourceUrl // Η πιο ασφαλής για την ενημέρωση της DB
                },
                // Μπορείς να προσθέσεις περισσότερα στοιχεία όπως merchantReference
                // merchantReference: `order-${uid}-${Date.now()}`
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const redirectUrl = paymentResponse.data.checkout_url;
        console.log("Successfully created Viva Wallet order. Redirect URL:", redirectUrl); // Logging επιτυχίας


        // Επιστροφή της URL ανακατεύθυνσης στο frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ redirectUrl }),
        };
    } catch (err) {
        // Αυτό το block πιάνει σφάλματα από τις κλήσεις axios ή άλλα απρόβλεπτα σφάλματα
        console.error("Viva Wallet createPayment error:", err.response?.data || err.message);
        // Επιστροφή σφάλματος στο frontend
        return {
            statusCode: err.response?.status || 500, // Επιστρέφει τον statusCode από την απάντηση Viva αν υπάρχει
            body: JSON.stringify({ error: err.response?.data || "Πρόβλημα με τη δημιουργία πληρωμής" }),
        };
    }
};
