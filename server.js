// Φόρτωση μεταβλητών από το .env αρχείο
require('dotenv').config();

// Εισαγωγή των απαραίτητων βιβλιοθηκών
const express = require('express');
const axios = require('axios'); // Για αιτήματα HTTP προς τη Viva Wallet API
const cors = require('cors'); // Για να επιτρέπονται αιτήματα από το frontend

// Δημιουργία Express app
const app = express();
// Ο Port που θα τρέξει ο server - διαβάζεται από το .env ή χρησιμοποιεί το 3000
const port = process.env.PORT || 3000;

// ========================================================
// Middleware
// ========================================================
// Επιτρέπει στο Express να διαβάζει JSON αιτήματα
app.use(express.json());

// Ρύθμιση CORS για να επιτρέπονται αιτήματα από το frontend σας
// Κατά την ανάπτυξη, βάλτε τοπικές διευθύνσεις (π.χ. http://localhost:8080)
// Στην παραγωγή, βάλτε τις διευθύνσεις όπου είναι αναρτημένο το frontend σας (π.χ. https://myakronapp.netlify.app)
app.use(cors({
    origin: [
        'http://localhost:8080', // ΒΑΛΕ ΤΟΝ PORT ΠΟΥ ΤΡΕΧΕΙ ΤΟ FRONTEND ΣΟΥ ΤΟΠΙΚΑ
        'https://myakronapp.netlify.app' // ΒΑΛΕ ΤΗ ΔΙΕΥΘΥΝΣΗ ΤΟΥ NETLIFY Ή ΑΛΛΟΥ HOSTING
        // Πρόσθεσε κι άλλες origins αν χρειάζεται
    ]
}));


// ========================================================
// Ρυθμίσεις Viva Wallet (Διαβάζονται από το .env)
// ========================================================
const VIVA_WALLET_MERCHANT_ID = process.env.VIVA_WALLET_MERCHANT_ID;
const VIVA_WALLET_API_KEY = process.env.VIVA_WALLET_API_KEY; // Συνήθως το Private Key για Basic Auth
const VIVA_WALLET_SOURCE_CODE = process.env.VIVA_WALLET_SOURCE_CODE;
const VIVA_WALLET_CALLBACK_URL = process.env.VIVA_WALLET_CALLBACK_URL; // Το URL του backend σας για τις ειδοποιήσεις

// Ελέγξτε αν οι μεταβλητές περιβάλλοντος έχουν φορτωθεί
if (!VIVA_WALLET_MERCHANT_ID || !VIVA_WALLET_API_KEY || !VIVA_WALLET_SOURCE_CODE || !VIVA_WALLET_CALLBACK_URL) {
    console.error("FATAL ERROR: Viva Wallet credentials or callback URL not set in .env file!");
    process.exit(1); // Τερματισμός της εφαρμογής αν δεν υπάρχουν τα απαραίτητα στοιχεία
}

// Base URLs για την Viva Wallet API
// **Προσοχή:** Χρησιμοποιήστε τα Demo URLs για δοκιμές και αλλάξτε σε Production URLs όταν είστε έτοιμοι
const VIVA_WALLET_API_BASE_URL = 'https://demo-api.vivapayments.com'; // Demo API Base URL
const VIVA_WALLET_CHECKOUT_BASE_URL = 'https://demo.vivapayments.com'; // Demo Checkout Base URL

// Δημιουργία του Basic Authentication Header (MerchantId:ApiKey σε Base64)
const basicAuth = Buffer.from(`${VIVA_WALLET_MERCHANT_ID}:${VIVA_WALLET_API_KEY}`).toString('base64');
const AUTH_HEADER = `Basic ${basicAuth}`;


// ========================================================
// Endpoint για τη δημιουργία εντολής πληρωμής
// Method: POST
// URL: /create-payment-order
// Λαμβάνει: { amount: number, description: string } στο body
// Επιστρέφει: { paymentUrl: string } ή { error: string, details: any }
// ========================================================
app.post('/create-payment-order', async (req, res) => {
    console.log('Received POST request at /create-payment-order', req.body);

    // Λάβετε τα στοιχεία πληρωμής από το αίτημα του frontend
    const { amount, description } = req.body;

    // **Σημαντικό:** Κάντε Validation των δεδομένων!
    if (amount === undefined || description === undefined || typeof amount !== 'number' || amount <= 0) {
        console.error('Validation Failed: Invalid amount or description');
        return res.status(400).json({ error: 'Invalid amount or description provided. Amount must be a positive number.' });
    }

    // Μετατροπή του ποσού σε λεπτά (η Viva Wallet API περιμένει ακέραιο σε λεπτά)
    const amountInCents = Math.round(amount * 100);

    // Δεδομένα για τη δημιουργία της εντολής πληρωμής στην Viva Wallet
    const orderData = {
        amount: amountInCents, // Ποσό σε λεπτά (integer)
        currency: 'EUR', // Το νόμισμα
        description: description, // Περιγραφή συναλλαγής
        sourceCode: VIVA_WALLET_SOURCE_CODE, // Ο Source Code σας από το .env
        paymentMethod: 0, // 0 για Card (συνήθως, ελέγξτε την τεκμηρίωση αν θέλετε άλλο method type)
        requestLang: 'el-GR', // Γλώσσα για τη σελίδα πληρωμής
        // ... μπορείτε να προσθέσετε κι άλλα πεδία όπως customer, metadata κ.λπ.

        // **Πολύ Σημαντικό:** Αυτό είναι το URL στο οποίο η Viva Wallet θα στείλει POST αιτήματα
        // όταν αλλάζει η κατάσταση της πληρωμής. Πρέπει να το υλοποιήσεις παρακάτω.
        callbackUrl: VIVA_WALLET_CALLBACK_URL,

        // Redirection URLs μετά την ολοκλήρωση της πληρωμής (η Viva Wallet ανακατευθύνει τον χρήστη εδώ)
        // Συνήθως τα βάζεις και στον Viva Wallet λογαριασμό σου.
        // ΒΑΛΕ ΤΑ ΣΩΣΤΑ URLS ΓΙΑ ΤΗΝ ΕΦΑΡΜΟΓΗ ΣΟΥ
        successUrl: 'https://myakronapp.netlify.app/success', // Παράδειγμα URL επιτυχίας
        failUrl: 'https://myakronapp.netlify.app/fail'     // Παράδειγμα URL αποτυχίας
    };

    try {
        // Κλήση της Viva Wallet API για δημιουργία εντολής
        const response = await axios.post(
            `${VIVA_WALLET_API_BASE_URL}/checkout/v2/orders`,
            orderData,
            {
                headers: {
                    'Authorization': AUTH_HEADER, // Ο Authentication Header μας
                    'Content-Type': 'application/json'
                }
            }
        );

        // Η Viva Wallet επιστρέφει τον κωδικό εντολής
        const orderCode = response.data.orderCode;
        console.log(`Viva Wallet Order Created Successfully. Order Code: ${orderCode}`);

        // Κατασκευάστε το πλήρες URL στο οποίο θα ανακατευθυνθεί ο χρήστης
        // Χρησιμοποιήστε τον σωστό Checkout Base URL (Demo ή Production)
        const paymentUrl = `${VIVA_WALLET_CHECKOUT_BASE_URL}/checkout/v2/preauth/${orderCode}`; // ή /pay/ αντί για /preauth/

        // Στείλτε το URL πληρωμής πίσω στο frontend
        res.status(200).json({ paymentUrl: paymentUrl });

    } catch (error) {
        // Διαχείριση σφαλμάτων από την κλήση της Viva Wallet API
        console.error('Error creating Viva Wallet order:');
        if (error.response) {
            // Λάβαμε απάντηση σφάλματος από την Viva Wallet
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
            res.status(error.response.status).json({
                error: 'Failed to create payment order with Viva Wallet',
                details: error.response.data // Επιστρέψτε τα details σφάλματος της Viva Wallet στο frontend
            });
        } else if (error.request) {
            // Το αίτημα έγινε, αλλά δεν λάβαμε απάντηση
            console.error('No response received:', error.request);
            res.status(500).json({ error: 'No response received from Viva Wallet API' });
        } else {
            // Κάτι άλλο πήγε στραβά
            console.error('Error setting up request:', error.message);
             res.status(500).json({ error: 'An error occurred while setting up the request' });
        }
    }
});

// ========================================================
// Endpoint για το Callback από τη Viva Wallet (Πρέπει να υλοποιηθεί)
// Method: POST
// URL: /viva-wallet-callback (Πρέπει να είναι ίδιο με το VIVA_WALLET_CALLBACK_URL στο .env)
// ========================================================
// Αυτό το endpoint καλείται από τους servers της Viva Wallet για να ειδοποιήσει
// την εφαρμογή σας για την κατάσταση της πληρωμής (επιτυχία, αποτυχία, κλπ.).
// ΔΕΝ το καλείτε από το frontend.
app.post('/viva-wallet-callback', (req, res) => {
    console.log('Received Viva Wallet Callback:', req.body);

    // TODO: ΥΛΟΠΟΙΗΣΕ ΑΥΤΟ ΤΟ ΤΜΗΜΑ!
    // 1. **Επαλήθευση Αιτήματος:** Ελέγξτε ότι το αίτημα προέρχεται όντως από τη Viva Wallet
    //    (π.χ. ελέγχοντας την υπογραφή του αιτήματος ή την IP).
    // 2. **Διαχείριση Δεδομένων:** Αναλύστε τα δεδομένα στο `req.body` για να βρείτε τον κωδικό εντολής (orderCode)
    //    και την κατάσταση της πληρωμής (status).
    // 3. **Ενημέρωση Βάσης Δεδομένων:** Βρείτε την αντίστοιχη παραγγελία στην βάση δεδομένων σας
    //    χρησιμοποιώντας τον orderCode και ενημερώστε την κατάστασή της (π.χ. 'Pending' -> 'Completed').
    // 4. **Λογική Εφαρμογής:** Εκτελέστε οποιαδήποτε άλλη λογική χρειάζεται μετά από μια επιτυχημένη πληρωμή
    //    (π.χ. αποστολή email επιβεβαίωσης, ενημέρωση αποθέματος).

    // Σημαντικό: Πρέπει να επιστρέψετε status 200 OK στη Viva Wallet
    // για να επιβεβαιώσετε ότι λάβατε επιτυχώς την ειδοποίηση.
    // Αν δεν επιστρέψετε 200, η Viva Wallet μπορεί να ξαναστείλει την ειδοποίηση αργότερα.
    res.status(200).send('Callback received'); // Στείλτε μια απλή επιβεβαίωση
});


// ========================================================
// Ένα απλό root endpoint για να ελέγξετε αν ο server τρέχει
// ========================================================
app.get('/', (req, res) => {
    res.send('Backend server is running!');
});


// ========================================================
// Εκκίνηση του Server
// ========================================================
app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
    console.log(`Configured Viva Wallet Callback URL: ${VIVA_WALLET_CALLBACK_URL}`);
    console.log(`Configured Viva Wallet Source Code: ${VIVA_WALLET_SOURCE_CODE}`);
    console.log(`Configured Viva Wallet API Base URL: ${VIVA_WALLET_API_BASE_URL}`);
});
