// netlify/functions/createPayment.js
const axios = require("axios");
const admin = require('firebase-admin'); // Προσθήκη για πλήρη κώδικα, αν λείπει

// Αρχικοποίηση Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Βεβαιώσου ότι η Environment Variable FIREBASE_SERVICE_ACCOUNT_KEY είναι σωστή JSON string
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Αν θες να ορίσεις Project ID μέσω κώδικα και όχι μόνο μεταβλητή, πρόσθεσέ το εδώ:
      // projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin in createPayment:", e); // Άλλαξε το μήνυμα για να ξέρεις από ποια function είναι
    // Η function θα αποτύχει αν δεν αρχικοποιηθεί η Admin SDK
    // Μπορείς να επιστρέψεις ένα σφάλμα εδώ αν θες να αποτρέψεις την εκτέλεση
    // return { statusCode: 500, body: JSON.stringify({ error: "Failed Firebase Init" }) };
    // Αλλά το Netlify θα το πιάσει ως Uncaught Exception αν δεν επιστρέψεις απάντηση
  }
}
// Μπορείς να ορίσεις τη βάση δεδομένων εδώ, αν η αρχικοποίηση πέτυχε
// const db = admin.firestore(); // Ή admin.database()


// ΔΕΝ ΒΑΖΕΙΣ ΤΑ ΠΡΑΓΜΑΤΙΚΑ IDs ΕΔΩ!
// Αυτά διαβάζουν τα IDs από τις Environment Variables του Netlify.
const clientId = process.env.VIVA_CLIENT_ID;
const clientSecret = process.env.VIVA_CLIENT_SECRET;

// Επιλέγει τις URLs ανάλογα με το περιβάλλον (production ή development/testing)
// Βεβαιώσου ότι έχεις ρυθμίσει την Environment Variable NODE_ENV στο Netlify.
const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.vivapayments.com' // Production URL
    : 'https://demo.vivapayments.com'; // Demo/Sandbox URL (Για δοκιμές)
const accountsUrl = process.env.NODE_ENV === 'production'
    ? 'https://accounts.vivapayments.com/connect/token' // Production URL
    : 'https://demoaccounts.vivapayments.com/connect/token'; // Demo/Sandbox URL

// Οι URL στις οποίες η Viva Wallet θα ανακατευθύνει τον χρήστη ή θα στείλει ειδοποίηση.
// ΑΝΤΙΚΑΤΑΣΤΗΣΕ ΤΟ 'YOUR_APP_DOMAIN' με το πραγματικό domain της εφαρμογής σου στο Netlify!
// Π.χ. 'https://myakronapp.netlify.app'
const appDomain = process.env.VIVA_SUCCESS_DOMAIN || 'https://myakronapp.netlify.app';

const successUrl = `${appDomain}/?payment_status=success`;
const failureUrl = `${appDomain}/?payment_status=failed`;
const sourceUrl = `${appDomain}/.netlify/functions/paymentWebhook`;

// Βεβαιώσου ότι έχεις αντικαταστήσει το YOUR_APP_DOMAIN παραπάνω με το δικό σου domain!
// Για παράδειγμα, αν το domain σου είναι myakronapp.netlify.app:
// const successUrl = `https://myakronapp.netlify.app/?payment_status=success`;
// const failureUrl = `https://myakronapp.netlify.app/?payment_status=failed`;
// const sourceUrl = `https://myakronapp.netlify.app/.netlify/functions/paymentWebhook`;


exports.handler = async function (event, context) {
    // Έλεγχος αν η Admin SDK αρχικοποιήθηκε
    if (!admin.apps.length) {
        console.error("Firebase Admin SDK not initialized. Cannot execute function.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server setup error" }) };
    }
    // Μπορείς να ορίσεις τη βάση δεδομένων εδώ αν χρειάζεται
    // const db = admin.firestore(); // Ή admin.database()

    if (event.httpMethod !== "POST") {
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
        // ΠΡΟΣΘΕΣΕ ΑΥΤΗ ΤΗ ΓΡΑΜΜΗ ΓΙΑ DEBUGGING
        console.log("Attempting to connect to URL:", accountsUrl);


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
                amount: amount, // Ποσό σε λεπτά
                customer: { // Προσθήκη στοιχείων πελάτη (καλό για logging στη Viva)
                   email: email,
                   customerText: `Firebase UID: ${uid}` // Αποθήκευση του UID για εύκολη αναγνώριση στο webhook
                },
                // Ορισμός των URL επιστροφής/ειδοποίησης
                callbackUrls: {
                   success: successUrl,
                   failure: failureUrl,
                   source: sourceUrl
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
        console.error("Viva Wallet createPayment error:", err.response?.data || err.message);
        // Επιστροφή σφάλματος στο frontend
        return {
            statusCode: err.response?.status || 500,
            body: JSON.stringify({ error: err.response?.data || "Πρόβλημα με τη δημιουργία πληρωμής" }),
        };
    }
};
