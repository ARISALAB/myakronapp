// netlify/functions/create-viva-order.js

// Διάβασε τα Viva Wallet credentials από τις Environment Variables του Netlify
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;

// Βασικά URLs για το Viva Wallet API
const VIVA_TOKEN_URL = 'https://accounts.vivapayments.com/connect/token';
const VIVA_ORDERS_URL = 'https://api.vivapayments.com/checkout/v2/orders';

// Βάλε τα δικά σου URLs επιτυχίας/αποτυχίας/ακύρωσης - αυτά είναι τα URLs
// στα οποία θα ανακατευθυνθεί ο χρήστης ΜΕΤΑ την αλληλεπίδραση με τη σελίδα πληρωμής του Viva Wallet.
// Ιδανικά, αυτά τα URLs θα οδηγούν σε μια σελίδα που ελέγχει την κατάσταση πληρωμής
// ή απλώς επιστρέφει τον χρήστη στην εφαρμογή.
// ΜΠΟΡΕΙΣ ΝΑ ΤΑ ΚΑΝΕΙΣ ΚΑΙ ΑΥΤΑ ENVIRONMENT VARIABLES ΑΝ ΘΕΛΕΙΣ.
const SUCCESS_URL = process.env.NETLIFY_URL + '/payment-success'; // Πρέπει να υπάρχει σελίδα payment-success.html
const FAILURE_URL = process.env.NETLIFY_URL + '/payment-failure'; // Πρέπει να υπάρχει σελίδα payment-failure.html
const CANCEL_URL = process.env.NETLIFY_URL + '/payment-cancelled'; // Πρέπει να υπάρχει σελίδα payment-cancelled.html
// Το process.env.NETLIFY_URL είναι μια ενσωματωμένη environment variable του Netlify
// που δίνει το URL της αναπτυγμένης σελίδας (π.χ. https://myakronapp.netlify.app)

// --- Κύρια συνάρτηση Netlify Function Handler ---
exports.handler = async (event, context) => {
    // Βεβαιωθείτε ότι είναι ένα POST αίτημα
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST' }
        };
    }

    // Βεβαιωθείτε ότι τα Viva Wallet credentials είναι ρυθμισμένα
    if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
         console.error('Viva Wallet credentials not set in environment variables!');
         return {
             statusCode: 500,
             body: JSON.stringify({ error: 'Server configuration error (Viva Wallet credentials missing)' })
         };
    }

    let requestBody;
    try {
        // Πάρτε τα δεδομένα από το σώμα του αιτήματος (που έστειλε το frontend)
        requestBody = JSON.parse(event.body);
        // Βασικός έλεγχος αν υπάρχουν απαραίτητα πεδία
        if (!requestBody.userId || !requestBody.amount) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing userId or amount in request body' })
            };
        }
    } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
         return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' })
        };
    }

    try {
        // 1. Λήψη Access Token από το Viva Wallet (OAuth2 Client Credentials Flow)

        // Δημιουργήστε το string για Basic Authentication (Client ID:Client Secret)
        const authString = `${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`;
        const base64AuthString = Buffer.from(authString).toString('base64');

        const tokenResponse = await fetch(VIVA_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64AuthString}`
            },
            body: new URLSearchParams({ // Το σώμα πρέπει να είναι urlencoded
                'grant_type': 'client_credentials',
                'scope': 'create_order' // Ζητάμε άδεια μόνο για δημιουργία παραγγελίας
            })
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            console.error('Viva Token Error:', tokenResponse.status, errorBody);
            return {
                statusCode: tokenResponse.status,
                body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${errorBody}` })
            };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Δημιουργία Παραγγελίας στο Viva Wallet Smart Checkout API

        // Στοιχεία για την παραγγελία
        const orderDetails = {
            amount: Math.round(requestBody.amount * 100), // Ποσό σε λεπτά!
            currencyCode: 'EUR', // Βάλε το νόμισμά σου (π.χ. 'EUR')
            paymentMethod: { // Μπορείς να ορίσεις συγκεκριμένες μεθόδους
                exclude: [5002, 5035, 5036, 5042] // Παράδειγμα: Εξαίρεση PayPal, Klarna, κλπ.
            },
            // Ορίζουμε τον user ID από το frontend ως αναφορά πελάτη για δική μας παρακολούθηση
            customerTrns: requestBody.userId,
            customer: { // Προαιρετικά στοιχεία πελάτη
                 customerReference: requestBody.userId // Άλλη αναφορά πελάτη
                 // Εδώ μπορείς να προσθέσεις email, όνομα, κλπ. αν τα έχεις από το frontend
            },
             clientReference: `order-${Date.now()}-${requestBody.userId}`, // Μια μοναδική αναφορά για την παραγγελία
            description: requestBody.description || 'Εφαρμογή Πληρωμής', // Περιγραφή
            // URLs επιστροφής μετά την πληρωμή
            callbackUrls: {
                successUrl: SUCCESS_URL,
                failureUrl: FAILURE_URL,
                cancelUrl: CANCEL_URL,
                // Webhook URL: Αυτό ρυθμίζεται στις Viva Wallet API settings,
                // αλλά μπορεί να οριστεί και εδώ για συγκεκριμένη παραγγελία αν χρειαστεί.
                // Συστήνεται να ρυθμιστεί στις API settings.
                // webhook: 'YOUR_VIVA_WEBHOOK_URL'
            },
            // Άλλες ρυθμίσεις αν χρειάζεται (π.χ. cardTokens, preauth, κλπ.)
        };

        const orderResponse = await fetch(VIVA_ORDERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` // Χρησιμοποιούμε το Access Token
            },
            body: JSON.stringify(orderDetails)
        });

        if (!orderResponse.ok) {
             const errorBody = await orderResponse.text();
             console.error('Viva Order Creation Error:', orderResponse.status, errorBody);
             return {
                statusCode: orderResponse.status,
                body: JSON.stringify({ error: `Failed to create Viva Wallet order: ${errorBody}` })
             };
        }

        const orderData = await orderResponse.json();
        // Το Smart Checkout API επιστρέφει ένα "code" που χρησιμοποιείται για το URL
        const orderCode = orderData.order.orderCode;

        // Δημιουργία του Smart Checkout URL
        // Το URL διαφέρει αν είσαι σε Production ή Demo περιβάλλον.
        // Βάλε το σωστό URL βάση του περιβάλλοντος σου.
        // const VIVA_CHECKOUT_BASE_URL = 'https://www.vivapayments.com/web/checkout/'; // Production
         const VIVA_CHECKOUT_BASE_URL = 'https://demo.vivapayments.com/web/checkout/'; // Demo

        const checkoutUrl = `${VIVA_CHECKOUT_BASE_URL}${orderCode}`;

        // 3. Επιστροφή του checkoutUrl στο frontend

        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: checkoutUrl })
        };

    } catch (error) {
        console.error('Server error during Viva Wallet order process:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Internal server error: ${error.message}` })
        };
    }
};
