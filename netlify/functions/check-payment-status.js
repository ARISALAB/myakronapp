// firebase-admin needs to be installed: npm install firebase-admin
const admin = require('firebase-admin');

// Ελέγχουμε αν το Firebase Admin app έχει ήδη αρχικοποιηθεί
// Αυτό είναι σημαντικό για serverless environments για επαναχρησιμοποίηση (warm starts)
if (!admin.apps.length) {
    try {
        // Διαβάζουμε το JSON string από την environment variable
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Αρχικοποίηση Firebase Admin SDK
        // Περνάμε ρητά τα βασικά πεδία από το service account JSON
        // Αυτό βοηθά την βιβλιοθήκη να καταλάβει ότι της δίνουμε object credentials
        // και όχι διαδρομή αρχείου, αντιμετωπίζοντας το σφάλμα ENAMETOOLONG.
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccountJson.project_id,
                privateKeyId: serviceAccountJson.private_key_id,
                privateKey: serviceAccountJson.private_key,
                clientEmail: serviceAccountJson.client_email,
                clientId: serviceAccountJson.client_id,
                // Μπορείτε να προσθέσετε και άλλα πεδία αν χρειαστεί,
                // αλλά συνήθως αυτά είναι αρκετά για auth και firestore/rtdb.
                // client_x509_cert_url: serviceAccountJson.client_x509_cert_url,
            }),
            // Αν χρησιμοποιείς Realtime Database, πρόσθεσε το databaseURL εδώ:
            // databaseURL: "https://YOUR-DATABASE-NAME.firebaseio.com"
        });
        console.log('✅ Firebase Admin Initialized successfully.'); // Log για επιβεβαίωση στα logs της function

    } catch (error) {
        // Χειρισμός σφαλμάτων κατά την αρχικοποίηση
        console.error('❌ Failed to initialize Firebase Admin:', error);
        // Επανέφερε το σφάλμα για να δεις την αιτία στα logs της function στο Netlify
        throw new Error('Firebase Admin Initialization Error: ' + error.message);
    }
} else {
    console.log('ℹ️ Firebase Admin already initialized.'); // Log αν η function είναι "ζεστή"
}

// Παίρνουμε αναφορές στις Firebase υπηρεσίες
const db = admin.firestore(); // Χρησιμοποιούμε Firestore
const authAdmin = admin.auth(); // Χρησιμοποιούμε Firebase Auth Admin για επαλήθευση tokens

// Netlify Function handler: Αυτή η συνάρτηση εκτελείται όταν καλείται η function.
exports.handler = async (event, context) => {
    // Βεβαιωθείτε ότι το request είναι POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            headers: {
                 'Access-Control-Allow-Origin': '*', // Επιτρέψτε κλήσεις από τον frontend σας
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Method Not Allowed, only POST is accepted.' }),
        };
    }

    // Παίρνουμε το Firebase ID Token από το Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('⚠️ No Firebase ID token was passed as a Bearer token in the Authorization header.');
        return {
            statusCode: 401, // Unauthorized
             headers: {
                 'Access-Control-Allow-Origin': '*',
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Authorization header missing or incorrect format. Must be "Bearer [token]".' }),
        };
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Επαλήθευση του ID Token με το Firebase Admin SDK
        // Αυτό μας λέει ποιος χρήστης (uid) κάνει την κλήση
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid; // Το μοναδικό Firebase User ID

        console.log(`🔍 Checking payment status for user UID: ${uid}`);

        // --- ΛΟΓΙΚΗ ΕΛΕΓΧΟΥ ΚΑΤΑΣΤΑΣΗΣ ΠΛΗΡΩΜΗΣ ---
        // Εδώ διαβάζουμε την κατάσταση πληρωμής από τη βάση δεδομένων (Firestore)
        const userDocRef = db.collection('users').doc(uid); // Αναφορά στο document του χρήστη με UID
        const userDoc = await userDocRef.get(); // Παίρνουμε το document

        let hasPaid = false;

        if (userDoc.exists) {
            // Αν υπάρχει το document του χρήστη στη Firestore
            const userData = userDoc.data(); // Παίρνουμε τα δεδομένα του document
            // Υποθέτουμε ότι υπάρχει ένα πεδίο 'hasPaid' τύπου boolean
            hasPaid = userData.hasPaid === true; // Διαβάζουμε την τιμή του πεδίου 'hasPaid'
             console.log(`✅ User ${uid} found in Firestore. Has paid: ${hasPaid}`);
        } else {
             // Αν δεν υπάρχει καν document για τον χρήστη, θεωρούμε ότι δεν έχει πληρώσει.
             // Ίσως θέλεις να δημιουργήσεις ένα document εδώ την πρώτη φορά.
             console.warn(`⚠️ User document not found for UID: ${uid}. Assuming not paid.`);
             hasPaid = false;
             // Προαιρετικά: Δημιουργία document χρήστη αν δεν υπάρχει
             // try {
             //     await userDocRef.set({ hasPaid: false, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
             //     console.log(`ℹ️ Created new user document for ${uid}`);
             // } catch (createError) {
             //     console.error(`❌ Failed to create user document for ${uid}:`, createError);
             //     // Συνεχίζουμε, το βασικό είναι ο έλεγχος πληρωμής
             // }
        }

        // --- ΤΕΛΟΣ ΛΟΓΙΚΗΣ ΕΛΕΓΧΟΥ ---

        // Επιστρέφουμε την κατάσταση πληρωμής στον frontend
        return {
            statusCode: 200, // OK
            headers: {
                 'Access-Control-Allow-Origin': '*', // Επιτρέψτε κλήσεις από τον frontend σας
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hasPaid: hasPaid }), // Επιστρέφουμε JSON object με την κατάσταση
        };

    } catch (error) {
        // Χειρισμός σφαλμάτων (π.χ. άκυρο token, σφάλμα βάσης δεδομένων)
        console.error('❌ Error during check-payment-status execution:', error);

        // Ειδικός χειρισμός αν το token είναι άκυρο ή έχει λήξει
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
             console.warn('⚠️ Authentication token error.');
             return {
                 statusCode: 401, // Unauthorized
                 headers: {
                     'Access-Control-Allow-Origin': '*',
                     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({ message: 'Invalid or expired authentication token. Please re-authenticate.' }),
             };
        }

        // Χειρισμός άλλων σφαλμάτων server (π.χ. σφάλμα Firestore)
        return {
            statusCode: 500, // Internal Server Error
             headers: {
                 'Access-Control-Allow-Origin': '*',
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
             },
            body: JSON.stringify({ message: 'Internal server error during payment status check.', error: error.message }),
        };
    }
};
