// netlify/functions/getUserPaymentStatus.js
const admin = require('firebase-admin');

// Αρχικοποίηση Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // projectId: process.env.FIREBASE_PROJECT_ID, // Μπορείς να το ορίσεις και εδώ
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin in getUserPaymentStatus:", e); // Άλλαξε το μήνυμα
     // Η function θα αποτύχει αν δεν αρχικοποιηθεί
     return { statusCode: 500, body: JSON.stringify({ error: "Server setup error" }) };
  }
}
const db = admin.firestore(); // Ορισμός Firestore μετά την αρχικοποίηση

exports.handler = async function (event, context) {
    // Έλεγχος αν η Admin SDK αρχικοποιήθηκε
    if (!admin.apps.length) {
        console.error("Firebase Admin SDK not initialized. Cannot execute function.");
        return { statusCode: 500, body: JSON.stringify({ error: "Server setup error" }) };
    }
     // Ορισμός Firestore εδώ αν δεν το έκανες παραπάνω
    // const db = admin.firestore();


    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const userUid = event.queryStringParameters.uid;

    if (!userUid) {
        console.error("Missing user ID in request.");
        return { statusCode: 400, body: JSON.stringify({ error: "Missing user ID" }) };
    }

    try {
        // ΠΡΩΤΑ, προσπάθησε να διαβάσεις το έγγραφο χρήστη
        const userDocRef = db.collection('users').doc(userUid);
        const userDoc = await userDocRef.get();

        let isPaid = false;

        if (!userDoc.exists) {
            // Αν το έγγραφο ΔΕΝ υπάρχει, ΔΗΜΙΟΥΡΓΗΣΕ ΤΟ
            console.log(`User document for UID ${userUid} not found. Creating it.`);
            await userDocRef.set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                isPaid: false // Προεπιλογή: ο νέος χρήστης δεν έχει πληρώσει
                // Μπορείς να προσθέσεις κι άλλα στοιχεία χρήστη εδώ αν χρειάζεσαι
                // email: event.queryStringParameters.email // Πρέπει να το στείλεις από frontend αν το θες
            });
            // Μετά τη δημιουργία, θεωρούμε ότι δεν έχει πληρώσει
            isPaid = false;
        } else {
            // Αν το έγγραφο υπάρχει, διάβασε την κατάσταση πληρωμής
            const userData = userDoc.data();
            isPaid = userData.isPaid === true;
        }

        console.log(`Payment status for user ${userUid}: ${isPaid}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ isPaid: isPaid }),
        };

    } catch (err) {
        // Αυτό το catch block θα πιάσει πλέον σφάλματα βάσης δεδομένων (αν όχι NOT_FOUND)
        console.error("Error getting or creating payment status from DB:", err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error accessing DB" }),
        };
    }
};
