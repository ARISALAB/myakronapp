// firebase-admin needs to be installed: npm install firebase-admin
const admin = require('firebase-admin');

// Check if Firebase Admin app is already initialized
if (!admin.apps.length) {
    // Initialize Firebase Admin using environment variables
    // The entire JSON content of the service account key
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Αν χρησιμοποιείς Realtime Database, πρόσθεσε το databaseURL
        // databaseURL: "https://YOUR-DATABASE-NAME.firebaseio.com"
    });
}

// Get references to Firebase services
const db = admin.firestore(); // Ή admin.database() για Realtime Database
const authAdmin = admin.auth();

// Netlify Function handler
exports.handler = async (event, context) => {
    // Ελέγχουμε αν το request είναι POST (όπως το κάνουμε από τον frontend κώδικα)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // Παίρνουμε το Firebase ID Token από το Authorization header
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.warn('No Firebase ID token was passed as a Bearer token in the Authorization header.');
        return {
            statusCode: 401, // Unauthorized
            body: JSON.stringify({ message: 'Unauthorized' }),
        };
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        // Επαλήθευση του ID Token
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid; // Αυτό είναι το Firebase User ID

        console.log(`Checking payment status for user: ${uid}`);

        // --- ΛΟΓΙΚΗ ΕΛΕΓΧΟΥ ΠΛΗΡΩΜΗΣ ---
        // ΕΔΩ ΠΡΕΠΕΙ ΝΑ ΔΙΑΒΑΣΕΙΣ ΤΗΝ ΚΑΤΑΣΤΑΣΗ ΠΛΗΡΩΜΗΣ ΑΠΟ ΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ ΣΟΥ
        // Παράδειγμα για Firestore:
        const userDocRef = db.collection('users').doc(uid);
        const userDoc = await userDocRef.get();

        let hasPaid = false;

        if (userDoc.exists) {
            // Υποθέτουμε ότι υπάρχει ένα πεδίο 'hasPaid' στη βάση δεδομένων
            const userData = userDoc.data();
            hasPaid = userData.hasPaid === true; // Βεβαιώσου ότι είναι boolean true
             console.log(`User ${uid} hasPaid status: ${hasPaid}`);
        } else {
             console.log(`User document not found for UID: ${uid}. Assuming not paid.`);
            // Αν δεν υπάρχει καν document για τον χρήστη, θεωρούμε ότι δεν έχει πληρώσει
             hasPaid = false;
             // Προαιρετικά: Μπορείς να δημιουργήσεις το document εδώ αν δεν υπάρχει
             // await userDocRef.set({ hasPaid: false }, { merge: true });
        }

        // --- ΤΕΛΟΣ ΛΟΓΙΚΗΣ ΕΛΕΓΧΟΥ ΠΛΗΡΩΜΗΣ ---


        // Επιστρέφουμε την κατάσταση πληρωμής στον frontend
        return {
            statusCode: 200,
            headers: {
                 // Καλό είναι να προσθέσεις CORS headers αν ο frontend είναι σε διαφορετικό domain
                 'Access-Control-Allow-Origin': '*', // Προσοχή σε production, βάλε το domain σου!
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
            },
            body: JSON.stringify({ hasPaid: hasPaid }),
        };

    } catch (error) {
        // Χειρισμός σφαλμάτων (π.χ. άκυρο token, σφάλμα βάσης δεδομένων)
        console.error('Error checking payment status:', error);

        // Ειδικός χειρισμός αν το token είναι άκυρο
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
             return {
                 statusCode: 401, // Unauthorized
                 headers: {
                     'Access-Control-Allow-Origin': '*',
                     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                      'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({ message: 'Invalid or expired authentication token.' }),
             };
        }

        // Άλλα σφάλματα server
        return {
            statusCode: 500, // Internal Server Error
             headers: {
                 'Access-Control-Allow-Origin': '*',
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                  'Content-Type': 'application/json'
             },
            body: JSON.stringify({ message: 'Internal server error', error: error.message }),
        };
    }
};
