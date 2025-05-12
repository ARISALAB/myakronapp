// netlify/functions/paymentWebhook.js
const axios = require("axios");
const admin = require('firebase-admin'); // Χρησιμοποίησε το Firebase Admin SDK

// Αρχικοποίηση Firebase Admin SDK για ασφαλή πρόσβαση στη DB από το backend
// Χρειάζεσαι το serviceAccountKey.json και να το διαχειριστείς ως Netlify Environment Variable (π.χ. FIREBASE_SERVICE_ACCOUNT_KEY)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // Βάλε την URL της βάσης σου αν χρησιμοποιείς Realtime Database. Για Firestore δεν χρειάζεται συνήθως.
      // databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
  } catch (e) {
    console.error("Failed to initialize Firebase Admin:", e);
    // Αν υπάρχει πρόβλημα στην αρχικοποίηση, οι functions θα αποτύχουν
  }
}
const db = admin.firestore(); // Χρησιμοποίησε admin.database() αν χρησιμοποιείς Realtime Database

// ΔΕΝ ΒΑΖΕΙΣ ΤΑ ΠΡΑΓΜΑΤΙΚΑ IDs ΕΔΩ!
const clientId = process.env.VIVA_CLIENT_ID;
const clientSecret = process.env.VIVA_CLIENT_SECRET;

// Επιλέγει τις URLs ανάλογα με το περιβάλλον
const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://api.vivapayments.com'
    : 'https://demo.vivapayments.com';
const accountsUrl = process.env.NODE_ENV === 'production'
    ? 'https://accounts.vivapayents.com/connect/token'
    : 'https://demoaccounts.vivapayments.com/connect/token';


exports.handler = async function (event, context) {
    // Το webhook της Viva Wallet στέλνει POST request
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    let vivaEvent;
    try {
        vivaEvent = JSON.parse(event.body);
    } catch (e) {
        console.error("Error parsing webhook body:", e);
        return { statusCode: 400, body: "Invalid JSON body" };
    }

    const orderCode = vivaEvent.EventData?.OrderCode;
    const eventType = vivaEvent.EventType;
    const eventId = vivaEvent.EventId;

    console.log(`Received Viva Wallet webhook: EventId=${eventId}, OrderCode=${orderCode}, EventType=${eventType}`);

    // Ελέγχουμε μόνο για το Payment.Notification event
    if (eventType === "Payment.Notification" && orderCode) {
        try {
            // 1. Απόκτηση νέου access token για επαλήθευση
            const tokenResponse = await axios.post(
                accountsUrl,
                new URLSearchParams({
                    grant_type: "client_credentials",
                    client_id: clientId,
                    client_secret: clientSecret,
                }),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );
            const accessToken = tokenResponse.data.access_token;

            // 2. Επαλήθευση της κατάστασης της παραγγελίας απευθείας από τη Viva Wallet
            const orderResponse = await axios.get(
                `${baseUrl}/checkout/v2/orders/${orderCode}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            const order = orderResponse.data;

            // Ελέγχουμε αν η κατάσταση της παραγγελίας είναι "Paid" (Ελέγξτε την τεκμηρίωση της Viva για ακριβείς καταστάσεις)
            if (order.status === 'Paid') {
                 console.log(`Order ${orderCode} status is CONFIRMED Paid. Proceeding to update DB.`);

                 // Βρες το UID του χρήστη. Το βάλαμε στο customerText στο createPayment.
                 const customerText = order.customer?.customerText;
                 const uidMatch = customerText ? customerText.match(/Firebase UID: (.*)/) : null;
                 const userUid = uidMatch ? uidMatch[1] : null;

                 if (userUid) {
                     // 3. Ενημέρωση βάσης δεδομένων Firebase (Firestore)
                     // Μαρκάρουμε τον χρήστη ως πληρωμένο
                     await db.collection('users').doc(userUid).set({
                         isPaid: true,
                         // Μπορείς να αποθηκεύσεις και άλλες πληροφορίες πληρωμής αν θες
                         paymentHistory: admin.firestore.FieldValue.arrayUnion({ // Προσθέτει στοιχείο σε πίνακα
                             orderCode: orderCode,
                             amount: order.amount,
                             date: admin.firestore.FieldValue.serverTimestamp(),
                             // ...άλλα στοιχεία από το 'order' object...
                         })
                     }, { merge: true }); // Χρησιμοποίησε merge: true

                     console.log(`User ${userUid} successfully marked as paid.`);
                     // Επιστρέφουμε 200 OK για να επιβεβαιώσουμε στη Viva ότι λάβαμε την ειδοποίηση
                     return { statusCode: 200, body: "Database updated successfully." };

                 } else {
                     console.error(`Firebase UID not found in customerText for order ${orderCode}.`);
                     // Επιστρέφουμε 400 ή 500 αν δεν μπορούμε να ταυτοποιήσουμε τον χρήστη
                     return { statusCode: 400, body: "User ID not found in payload." };
                 }

            } else {
                console.log(`Order ${orderCode} status is ${order.status}. No DB update needed for non-Paid status.`);
                // Επιστρέφουμε 200 OK ακόμα και αν δεν είναι paid, για να μην προσπαθεί ξανά η Viva
                return { statusCode: 200, body: `Order status is ${order.status}, no update performed.` };
            }

        } catch (err) {
            console.error("Error processing Viva Wallet webhook:", err.response?.data || err.message);
             // Επιστρέφουμε 500 Internal Server Error αν κάτι πήγε στραβά,
             // ώστε η Viva Wallet να ξαναπροσπαθήσει αργότερα να στείλει την ειδοποίηση.
             return { statusCode: 500, body: "Internal Server Error during webhook processing." };
        }
    } else {
         console.log("Webhook event type not relevant or missing orderCode.");
         // Επιστρέφουμε 200 OK για events που δεν μας ενδιαφέρουν
         return { statusCode: 200, body: "Event type not processed." };
    }
};
