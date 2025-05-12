const admin = require('firebase-admin');

let firebaseInitialized = false;

exports.handler = async function (event, context) {
  // Αρχικοποίηση Firebase Admin SDK (μόνο μία φορά)
  if (!firebaseInitialized) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.log("Firebase Admin SDK initialized in getUserPaymentStatus.");
    } catch (e) {
      console.error("Failed to initialize Firebase Admin in getUserPaymentStatus:", e);
      return { statusCode: 500, body: JSON.stringify({ error: "Server setup error" }) };
    }
  }

  const db = admin.firestore();

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const userUid = event.queryStringParameters.uid;

  if (!userUid) {
    console.error("Missing user ID in request.");
    return { statusCode: 400, body: JSON.stringify({ error: "Missing user ID" }) };
  }

  try {
    const userDocRef = db.collection('users').doc(userUid);
    const userDoc = await userDocRef.get();

    let isPaid = false;

    if (!userDoc.exists) {
      console.log(`User document for UID ${userUid} not found. Creating it.`);
      await userDocRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isPaid: false
      });
    } else {
      const userData = userDoc.data();
      isPaid = userData.isPaid === true;
    }

    console.log(`Payment status for user ${userUid}: ${isPaid}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ isPaid }),
    };

  } catch (err) {
    console.error("Error accessing Firestore:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error accessing DB" }),
    };
  }
};
