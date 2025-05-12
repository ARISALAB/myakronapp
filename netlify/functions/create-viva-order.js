// netlify/functions/create-viva-order.js

// Διάβασε τα Viva Wallet credentials από τις Environment Variables του Netlify
const VIVA_CLIENT_ID = process.env.VIVA_CLIENT_ID;
const VIVA_CLIENT_SECRET = process.env.VIVA_CLIENT_SECRET;

// Βασικά URLs για το Viva Wallet API (DEMO περιβάλλον)
const VIVA_TOKEN_URL = 'https://demo.vivapayments.com/connect/token';
const VIVA_ORDERS_URL = 'https://demo-api.vivapayments.com/checkout/v2/orders';

// Βάλε το σωστό URL βάση του περιβάλλοντος σου (DEMO Frontend Checkout Page)
const VIVA_CHECKOUT_BASE_URL = 'https://demo.vivapayments.com/web/checkout/';

// Βάλε τα URLs επιτυχίας/αποτυχίας/ακύρωσης
const NETLIFY_SITE_URL = process.env.NETLIFY_URL || process.env.URL; 
const SUCCESS_URL = NETLIFY_SITE_URL + '/payment-success';
const FAILURE_URL = NETLIFY_SITE_URL + '/payment-failure';
const CANCEL_URL = NETLIFY_SITE_URL + '/payment-cancelled';

exports.handler = async (event, context) => {
    // Βεβαιωθείτε ότι είναι ένα POST αίτημα
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
            headers: { 'Allow': 'POST', 'Content-Type': 'application/json' }
        };
    }

    // Ελέγξτε αν τα credentials είναι σωστά
    if (!VIVA_CLIENT_ID || !VIVA_CLIENT_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Viva Wallet credentials missing' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    let requestBody;
    try {
        // Παίρνουμε τα δεδομένα από το σώμα του αιτήματος
        requestBody = JSON.parse(event.body);
        if (!requestBody.userId || requestBody.amount <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid userId or amount' }),
                headers: { 'Content-Type': 'application/json' }
            };
        }
    } catch (parseError) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid JSON body' }),
            headers: { 'Content-Type': 'application/json' }
        };
    }

    try {
        // 1. Λήψη του Access Token από το Viva Wallet API
        const authString = `${VIVA_CLIENT_ID}:${VIVA_CLIENT_SECRET}`;
        const base64AuthString = Buffer.from(authString).toString('base64');

        const tokenResponse = await fetch(VIVA_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${base64AuthString}`
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'scope': 'payments'
            })
        });

        if (!tokenResponse.ok) {
            const errorBody = await tokenResponse.text();
            return {
                statusCode: tokenResponse.status,
                body: JSON.stringify({ error: `Failed to get Viva Wallet token: ${errorBody}` }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // 2. Δημιουργία παραγγελίας Viva Wallet
        const orderDetails = {
            amount: Math.round(requestBody.amount * 100),  // Ποσό σε λεπτά
            currencyCode: 'EUR',
            customerTrns: requestBody.userId,  // Αναφορά πελάτη
            clientReference: `order-${Date.now()}-${requestBody.userId}`, // Μοναδικό reference
            description: requestBody.description || 'Εφαρμογή Πληρωμής',
            callbackUrls: {
                successUrl: SUCCESS_URL,
                failureUrl: FAILURE_URL,
                cancelUrl: CANCEL_URL
            }
        };

        const orderResponse = await fetch(VIVA_ORDERS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(orderDetails)
        });

        if (!orderResponse.ok) {
            const errorBody = await orderResponse.text();
            return {
                statusCode: orderResponse.status,
                body: JSON.stringify({ error: `Failed to create Viva Wallet order: ${errorBody}` }),
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const orderData = await orderResponse.json();
        const orderCode = orderData.order.orderCode;

        // Δημιουργία του Smart Checkout URL
        const checkoutUrl = `${VIVA_CHECKOUT_BASE_URL}${orderCode}`;

        // Επιστροφή του URL για πληρωμή στο frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: checkoutUrl }),
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Internal server error: ${error.message}` }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
