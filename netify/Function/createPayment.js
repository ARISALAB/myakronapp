// netlify/functions/createPayment.js
const axios = require("axios");

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
// Π.χ. 'https://my-restaurant-app.netlify.app'
const successUrl = `https://YOUR_APP_DOMAIN/?payment_status=success`; // Ανακατεύθυνση πίσω στην αρχική σελίδα με success status
const failureUrl = `https://YOUR_APP_DOMAIN/?payment_status=failed`; // Ανακατεύθυνση πίσω στην αρχική σελίδα με failed status
const sourceUrl = `https://YOUR_APP_DOMAIN/.netlify/functions/paymentWebhook`; // Server-to-server notification (ΠΟΛΥ ΣΗΜΑΝΤΙΚΟ ΓΙΑ ΤΗΝ ΑΣΦΑΛΕΙΑ)


exports.handler = async function (event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Λαμβάνει τα στοιχεία από το frontend
    const { uid, email, amount } = JSON.parse(event.body);

    // Έλεγχος για απαραίτητα στοιχεία
    if (!uid || !email || !amount || typeof amount !== 'number' || amount <= 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing or invalid payment data" }) };
    }

    try {
        // 1. Απόκτηση access token από τη Viva Wallet
        const tokenResponse = await axios.post(
            accountsUrl,
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

        // 2. Δημιουργία πληρωμής (payment order) στη Viva Wallet
        const paymentResponse = await axios.post(
            `${baseUrl}/checkout/v2/orders`,
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
