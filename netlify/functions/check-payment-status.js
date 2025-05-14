// Απαιτεί την εγκατάσταση της βιβλιοθήκης: npm install firebase-admin
const admin = require('firebase-admin');

// Ελέγχουμε αν το Firebase Admin app έχει ήδη αρχικοποιηθεί.
// Αυτό είναι σημαντικό για serverless environments (όπως το Netlify Functions)
// ώστε να επαναχρησιμοποιείται η αρχικοποιημένη instance σε επόμενες κλήσεις (warm starts).
if (!admin.apps.length) {
    try {
        // Διαβάζουμε το JSON string που περιέχει τα credentials του Service Account
        // από την environment variable του Netlify.
        // process.env.FIREBASE_SERVICE_ACCOUNT πρέπει να περιέχει το πλήρες JSON string.
        const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        // Αρχικοποίηση Firebase Admin SDK με τα credentials.
        // Χρησιμοποιούμε admin.credential.cert() και του περνάμε ένα object
        // με τα βασικά πεδία από το service account JSON.
        // Αυτή η μέθοδος είναι ο συνιστώμενος τρόπος για credentials από service account.
        // Η ρητή αναφορά στα πεδία βοηθά την βιβλιοθήκη να αναγνωρίσει σωστά τον τύπο
        // των credentials και να αποφύγει πιθανά προβλήματα (όπως το σφάλμα ENAMETOOLONG).
        admin.initializeApp({
            credential: admin.credential.cert({
                // Οι ονομασίες των πεδίων εδώ (projectId, clientEmail, privateKey)
                // είναι αυτές που περιμένει η μέθοδος credential.cert().
                // Οι τιμές τους παίρνονται από το JSON object που διαβάσαμε (serviceAccountJson).
                projectId: serviceAccountJson.project_id,
                clientEmail: serviceAccountJson.client_email,
                privateKey: serviceAccountJson.private_key,
                // Τα πεδία private_key_id, client_id, auth_uri, κλπ. δεν είναι
                // απαραίτητα για την αρχικοποίηση μέσω credential.cert({}) object.
            }),
            // Αν χρησιμοποιείς και Realtime Database, πρόσθεσε το databaseURL εδώ:
            // databaseURL: "https://YOUR-REALTIME-DATABASE-NAME.firebaseio.com"
        });
        // Log για επιβεβαίωση στα logs της function στο Netlify
        console.log('✅ Firebase Admin Initialized successfully.');

    } catch (error) {
        // Χειρισμός σφαλμάτων κατά την αρχικοποίηση του Firebase Admin
        console.error('❌ Failed to initialize Firebase Admin:', error);
        // Ρίχνουμε ένα νέο σφάλμα με περισσότερες πληροφορίες για να το δούμε καθαρά στα logs
        // και να καταλάβουμε αν το πρόβλημα ήταν στο parsing του JSON ή στην ίδια την αρχικοποίηση.
        throw new Error('Firebase Admin Initialization Error: ' + error.message);
    }
} else {
    // Αυτό το log εμφανίζεται αν η function παραμένει "ζεστή" μεταξύ κλήσεων
    console.log('ℹ️ Firebase Admin already initialized.');
}

// Παίρνουμε αναφορές στις Firebase υπηρεσίες που θα χρησιμοποιήσουμε
// (Firestore και Auth Admin για επαλήθευση tokens).
const db = admin.firestore();
const authAdmin = admin.auth();

// Ο κύριος handler της Netlify Function.
// Αυτή η async συνάρτηση εκτελείται κάθε φορά που καλείται η function.
exports.handler = async (event, context) => {
    // === 1. Έλεγχος HTTP Method ===
    // Βεβαιωθείτε ότι το request είναι POST, όπως αναμένεται από τον frontend.
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405, // Method Not Allowed
            headers: {
                 // Τα CORS headers είναι σημαντικά για να επιτρέπουν κλήσεις
                 // από τον frontend σας αν τρέχει σε διαφορετικό domain.
                 'Access-Control-Allow-Origin': '*', // Σε production, βάλε το domain σου π.χ. 'https://your-app.com'
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: 'Method Not Allowed, only POST is accepted.' }),
        };
    }

    // === 2. Επαλήθευση Firebase Auth Token ===
    // Παίρνουμε το Firebase ID Token που έστειλε ο frontend στο Authorization header.
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

    const idToken = authHeader.split('Bearer ')[1]; // Αφαιρούμε το "Bearer " για να πάρουμε μόνο το token.

    try {
        // Επαληθεύουμε το ID Token με το Firebase Admin SDK.
        // Αυτό είναι ο ασφαλής τρόπος να επιβεβαιώσουμε ότι ο χρήστης είναι συνδεδεμένος
        // και να πάρουμε το μοναδικό του UID.
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const uid = decodedToken.uid; // Το μοναδικό Firebase User ID

        console.log(`🔍 Checking payment status for user UID: ${uid}`);

        // === 3. ΛΟΓΙΚΗ ΕΛΕΓΧΟΥ ΚΑΤΑΣΤΑΣΗΣ ΠΛΗΡΩΜΗΣ ΑΠΟ ΤΗ ΒΑΣΗ ΔΕΔΟΜΕΝΩΝ ===
        // Εδώ διαβάζουμε την κατάσταση πληρωμής για τον συγκεκριμένο χρήστη (UID) από τη Firestore.
        // Υποθέτουμε ότι έχεις μια collection 'users' και κάθε document έχει ID το UID του χρήστη.
        const userDocRef = db.collection('users').doc(uid); // Αναφορά στο document του χρήστη με UID
        const userDoc = await userDocRef.get(); // Παίρνουμε το document

        let hasPaid = false; // Προεπιλογή: ο χρήστης δεν έχει πληρώσει

        if (userDoc.exists) {
            // Αν υπάρχει το document του χρήστη στη Firestore
            const userData = userDoc.data(); // Παίρνουμε τα δεδομένα του document
            // Υποθέτουμε ότι υπάρχει ένα πεδίο 'hasPaid' τύπου boolean σε αυτό το document.
            hasPaid = userData.hasPaid === true; // Διαβάζουμε την τιμή του πεδίου 'hasPaid'. Χρησιμοποιούμε === true
                                                  // για να βεβαιωθούμε ότι είναι ακριβώς boolean true.
             console.log(`✅ User ${uid} found in Firestore. Has paid: ${hasPaid}`);
        } else {
             // Αν δεν υπάρχει καν document για τον χρήστη στη βάση, θεωρούμε ότι δεν έχει πληρώσει.
             // Ίσως εδώ είναι καλό να δημιουργήσεις αυτόματα το document για νέους χρήστες.
             console.warn(`⚠️ User document not found for UID: ${uid}. Assuming not paid.`);
             hasPaid = false; // Βεβαιωνόμαστε ότι είναι false.
             // Προαιρετικά: Δημιουργία document χρήστη την πρώτη φορά που τον βλέπουμε
             // Αυτό μπορεί να γίνει και αλλού (π.χ. κατά την εγγραφή/πρώτη σύνδεση)
             // try {
             //     await userDocRef.set({ hasPaid: false, createdAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
             //     console.log(`ℹ️ Created new user document for ${uid}`);
             // } catch (createError) {
             //     console.error(`❌ Failed to create user document for ${uid}:`, createError);
             //     // Αν αποτύχει η δημιουργία, δεν σταματάμε τον έλεγχο πληρωμής, απλά το καταγράφουμε.
             // }
        }

        // === 4. Επιστροφή Απάντησης στον Frontend ===
        // Επιστρέφουμε την κατάσταση πληρωμής στον frontend.
        return {
            statusCode: 200, // OK - Η κλήση ήταν επιτυχής.
            headers: {
                 'Access-Control-Allow-Origin': '*', // Επιτρέψτε κλήσεις από τον frontend σας
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json' // Δηλώνουμε ότι η απάντηση είναι JSON
            },
            body: JSON.stringify({ hasPaid: hasPaid }), // Επιστρέφουμε ένα JSON object με το αποτέλεσμα
        };

    } catch (error) {
        // === 5. Χειρισμός Σφαλμάτων κατά την εκτέλεση της Function ===
        // Πιάνουμε τυχόν σφάλματα που συνέβησαν μετά την επιτυχή αρχικοποίηση
        // (π.χ. σφάλμα επαλήθευσης token, σφάλμα βάσης δεδομένων).
        console.error('❌ Error during check-payment-status execution:', error);

        // Ειδικός χειρισμός αν το token είναι άκυρο, έχει λήξει ή έχει ανακληθεί
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked' || error.code === 'auth/user-disabled') {
             console.warn('⚠️ Authentication token error detected.');
             return {
                 statusCode: 401, // Unauthorized
                 headers: {
                     'Access-Control-Allow-Origin': '*',
                     'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                     'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({ message: 'Authentication failed. Please re-authenticate.', errorCode: error.code }),
             };
        }

        // Χειρισμός άλλων σφαλμάτων server (π.χ. σφάλμα Firestore, απρόβλεπτο σφάλμα)
        return {
            statusCode: 500, // Internal Server Error
             headers: {
                 'Access-Control-Allow-Origin': '*',
                 'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 'Content-Type': 'application/json'
             },
            body: JSON.stringify({ message: 'An internal server error occurred.', error: error.message }),
        };
    }
};
