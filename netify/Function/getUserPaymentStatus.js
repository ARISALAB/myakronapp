// netlify/functions/getUserPaymentStatus.js
const admin = require('firebase-admin'); // Χρησιμοποίησε το Firebase Admin SDK

// Αρχικοποίηση Firebase Admin SDK (όπως στο paymentWebhook function)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com` // Για Realtime DB
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
     // Αν υπάρχει πρόβλημα στην αρχικοποίηση, οι functions θα αποτύχουν
  }
}
const db = admin.firestore(); // Χρησιμοποίησε admin.database() για Realtime Database

exports.handler = async function (event, context) {
    // Αυτή η function καλείται με GET request
    if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    // Λαμβάνει το UID από τα query parameters της URL
    const userUid = event.queryStringParameters.uid;

    // Έλεγχος αν υπάρχει UID
    if (!userUid) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing user ID" }) };
    }

    try {
        // Ανάκτηση του εγγράφου χρήστη από τη συλλογή 'users' στο Firestore
        const userDoc = await db.collection('users').doc(userUid).get();

        let isPaid = false;
        // Ελέγχος αν το έγγραφο υπάρχει και αν το πεδίο 'isPaid' είναι true
        if (userDoc.exists) {
            const userData = userDoc.data();
            isPaid = userData.isPaid === true; // Βεβαιώσου ότι είναι boolean true
        }

        // Επιστροφή της κατάστασης πληρωμής στο frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ isPaid: isPaid }),
        };

    } catch (err) {
        console.error("Error getting payment status from DB:", err);
        // Επιστροφή σφάλματος
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
