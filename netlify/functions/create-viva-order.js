// netlify/functions/create-viva-order.js

// Διάβασε τα Viva Wallet credentials από τις Environment Variables του Netlify
// ΒΕΒΑΙΩΣΟΥ ΟΤΙ ΑΥΤΑ ΕΙΝΑΙ ΤΑ ΔΙΑΠΙΣΤΕΥΤΗΡΙΑ ΓΙΑ ΤΟ DEMO ΠΕΡΙΒΑΛΛΟΝ ΣΟΥ ΣΤΟ VIVA WALLET
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;

// Βασικά URLs για το Viva Wallet API (DEMO περιβάλλον)
const VIVA_TOKEN_URL = 'https://demo.vivapayments.com/connect/token';
const VIVA_ORDERS_URL = 'https://demo-api.vivapayments.com/checkout/v2/orders';

// Βάλε το σωστό URL βάση του περιβάλλοντος σου (DEMO Frontend Checkout Page)
const VIVA_CHECKOUT_BASE_URL = 'https://demo.vivapayments.com/web/checkout/'; // <-- URL της σελίδας πληρωμής σε DEMO

// Βάλε τα δικά σου URLs επιτυχίας/αποτυχίας/ακύρωσης - αυτά είναι τα URLs
// στα οποία θα ανακατευθυνθεί ο χρήστης ΜΕΤΑ την αλληλεπίδραση με τη σελίδα πληρωμής του Viva Wallet.
// ΠΡΕΠΕΙ να τα δημιουργήσεις στο frontend σου (π.χ. payment-success.html).
// ΜΠΟΡΕΙΣ ΝΑ ΤΑ ΚΑΝΕΙΣ ΚΑΙ ΑΥΤΑ ENVIRONMENT VARIABLES ΑΝ ΘΕΛΕΙς.
const NETLIFY_SITE_URL = process.env.NETLIFY_URL || process.env.URL; // Λαμβάνει το URL του site από Netlify env vars
const SUCCESS_URL = NETLIFY_SITE_URL + '/payment-success'; // Πρέπει να υπάρχει σελίδα payment-success.html
const FAILURE_URL = NETLIFY_SITE_URL + '/payment-failure'; // Πρέπει να υπάρχει σελίδα payment-failure.html
const CANCEL_URL = NETLIFY_SITE_URL + '/payment-cancelled'; // Πρέπει να υπάρχει σελίδα payment-cancelled.html


// --- Κύρια συνάρτηση Netlify Function Handler ---
exports.handler = async (event, context) => {
    // Βεβαιωθείτε ότι είναι ένα POST αίτημα
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST', 'Content-Type': 'application/json' } // Προσθήκη Content-Type
        };
    }

    // Βεβαιωθείτε ότι τα Viva Wallet credentials είναι ρυθμισμένα
    if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
         console.error('Viva Wallet credentials not set in environment variables!');
         return {
             statusCode: 500,
             body: JSON.stringify({ error: 'Server configuration error (Viva Wallet credentials missing)' }),
             headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
         };
    }

    let requestBody;
    try {
        // Πάρτε τα δεδομένα από το σώμα του αιτήματος (που έστειλε το frontend)
        requestBody = JSON.parse(event.body);
        // Βασικός έλεγχος αν υπάρχουν απαραίτητα πεδία
        if (!requestBody.userId || requestBody.amount === undefined || requestBody.amount === null || requestBody.amount <= 0) {
            // Ελέγχουμε για undefined/null/ <= 0 για το ποσό
            console.error('Validation Error: Missing or invalid userId or amount', requestBody);
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing or invalid userId or amount in request body' }),
                headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
            };
        }
    } catch (parseError) {
        console.error('Failed to parse request body:', parseError);
         return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
            headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
        };
    }

    try {
        // 1. Λήψη Access Token από το Viva Wallet (OAuth2 Client Credentials Flow)

        // Δημιουργήστε το string για Basic Authentication (Client ID:Client Secret)
        // Η Buffer είναι διαθέσιμη σε Node.js (που τρέχουν οι Netlify Functions)
        const authString = `${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`;
        const base64AuthString = Buffer.from(authString).toString('base64');

        console.log('Requesting Viva Wallet token...'); // Log για debugging

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
            // Επιστρέφουμε πιο αναλυτικό σφάλμα στο frontend
            return {
                statusCode: tokenResponse.status, // Επιστρέφουμε τον κωδικό σφάλματος από το Viva Wallet
                body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${errorBody}` }),
                 headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
            };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        console.log('Successfully obtained Viva Wallet token.'); // Log για επιτυχία

        // 2. Δημιουργία Παραγγελίας στο Viva Wallet Smart Checkout API

        // Στοιχεία για την παραγγελία
        const orderDetails = {
            amount: Math.round(requestBody.amount * 100), // Ποσό σε λεπτά (ακέραιος)!
            currencyCode: 'EUR', // Βάλε το νόμισμά σου (π.χ. 'EUR') - Πρέπει να είναι 3 κεφαλαία γράμματα ISO 4217
            paymentMethod: { // Μπορείς να ορίσεις συγκεκριμένες μεθόδους
                // exclude: [5002, 5035, 5036, 5042] // Παράδειγμα: Εξαίρεση PayPal, Klarna, κλπ.
                // include: [ /* specific payment method codes */ ] // Ή να επιτρέψεις μόνο συγκεκριμένες
            },
            // Ορίζουμε τον user ID από το frontend ως αναφορά πελάτη για δική μας παρακολούθηση
            // Αυτό είναι πολύ χρήσιμο για να ξέρεις σε ποιον χρήστη αντιστοιχεί η πληρωμή όταν λάβεις το webhook.
            customerTrns: requestBody.userId,
            customer: { // Προαιρετικά στοιχεία πελάτη
                 customerReference: requestBody.userId // Άλλη αναφορά πελάτη, χρησιμοποιείται για αναφορές
                 // email: 'user@example.com', // Αν έχεις το email του χρήστη
                 // fullName: 'Όνομα Χρήστη' // Αν έχεις το όνομα του χρήστη
            },
            // Μια μοναδική αναφορά για την παραγγελία από την πλευρά σου
            clientReference: `order-${Date.now()}-${requestBody.userId}`,
            description: requestBody.description || 'Εφαρμογή Πληρωμής', // Περιγραφή

            // URLs επιστροφής μετά την πληρωμή
            callbackUrls: {
                successUrl: SUCCESS_URL,
                failureUrl: FAILURE_URL,
                cancelUrl: CANCEL_URL,
                // Webhook URL: Αυτό ρυθμίζεται στις Viva Wallet API settings (συνιστάται),
                // αλλά μπορεί να οριστεί και εδώ για συγκεκριμένη παραγγελία αν χρειαστεί.
                // ΒΑΛΕ ΕΔΩ ΤΟ URL ΤΗΣ ΔΙΚΗΣ ΣΟΥ NETLIFY FUNCTION ΠΟΥ ΘΑ ΛΑΜΒΑΝΕΙ ΤΑ WEBHOOKS
                // (π.χ. 'https://myakronapp.netlify.app/.netlify/functions/viva-webhook')
                // webhook: 'YOUR_VIVA_WEBHOOK_URL'
            },
            // Άλλες ρυθμίσεις αν χρειάζεται (π.χ. cardTokens, preauth, κλπ.)
        };

         console.log('Creating Viva Wallet order with details:', JSON.stringify(orderDetails)); // Log λεπτομερειών παραγγελίας

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
             // Επιστρέφουμε πιο αναλυτικό σφάλμα στο frontend
             return {
                statusCode: orderResponse.status, // Επιστρέφουμε τον κωδικό σφάλματος από το Viva Wallet
                body: JSON.stringify({ error: `Failed to create Viva Wallet order: ${errorBody}` }),
                headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
             };
        }

        const orderData = await orderResponse.json();
        // Το Smart Checkout API επιστρέφει ένα "code" που χρησιμοποιείται για το URL
        const orderCode = orderData.order.orderCode;

        // Δημιουργία του Smart Checkout URL
        const checkoutUrl = `${VIVA_CHECKOUT_BASE_URL}${orderCode}`;

        console.log('Successfully created Viva Wallet order. Checkout URL:', checkoutUrl); // Log για επιτυχία

        // 3. Επιστροφή του checkoutUrl στο frontend

        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: checkoutUrl }),
            headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
        };

    } catch (error) {
        console.error('Server error during Viva Wallet order process:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Internal server error: ${error.message}` }),
             headers: { 'Content-Type': 'application/json' } // Προσθήκη Content-Type
        };
    }
};
