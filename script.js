// --- Firebase Configuration ---
// Η δική σου ρύθμιση Firebase (αντικατάστησε αν είναι διαφορετική)
const firebaseConfig = {
    apiKey: "AIzaSyCQZMLh_gaiLWEtMw6VeDVXdkuNW64HgOE",
    authDomain: "restaurantfinanceapp.firebaseapp.com",
    projectId: "restaurantfinanceapp",
    storageBucket: "restaurantfinanceapp.firebasestorage.app",
    messagingSenderId: "838820261500",
    appId: "1:838820261500:web:3582c04f2d678af088e3f9",
    measurementId: "G-EM27Q8R9RZ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Αν χρησιμοποιείς Firestore για κατάσταση πληρωμής, κάνε uncomment την επόμενη γραμμή
// const db = firebase.firestore();
// Αν χρησιμοποιείς Analytics, κάνε uncomment την επόμενη γραμμή
// const analytics = firebase.analytics();

// --- Get References to DOM Elements ---
const authSection = document.getElementById('auth-section');
const paymentSection = document.getElementById('payment-section');
const appSection = document.getElementById('app-section');

const authMessage = document.getElementById('auth-message'); // Μήνυμα "Παρακαλώ συνδεθείτε"
const googleSignInButton = document.getElementById('google-signin-button');

const userInfoDiv = document.getElementById('user-info'); // Container για info χρήστη
const userPhotoImg = document.getElementById('user-photo'); // Φωτογραφία χρήστη
const userNameSpan = document.getElementById('user-name'); // Όνομα χρήστη

const vivaPaymentButton = document.getElementById('viva-payment-button');
const signoutButton = document.getElementById('signout-button'); // Κουμπί αποσύνδεσης στην payment section
const signoutButtonApp = document.getElementById('signout-button-app'); // Κουμπί αποσύνδεσης στην app section

const authStatusDiv = document.getElementById('auth-status'); // Για προσωρινά μηνύματα σύνδεσης
const paymentStatusDiv = document.getElementById('payment-status'); // Για μηνύματα πληρωμής

// --- Firebase Authentication ---

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // Ο χρήστης είναι συνδεδεμένος
        console.log('User is signed in:', user.uid);

        // Εμφάνιση πληροφοριών χρήστη
        // Χρησιμοποιούμε κενό string αν δεν υπάρχει photoURL για να μην εμφανίζεται σπασμένη εικόνα
        userPhotoImg.src = user.photoURL || '';
        // Εμφάνιση ονόματος ή email αν δεν υπάρχει displayName
        userNameSpan.textContent = user.displayName || user.email || 'Χρήστης';

        // Εμφάνιση της ενότητας πληροφοριών χρήστη
        userInfoDiv.classList.remove('hidden');

        // Κρύψε τα στοιχεία της ενότητας σύνδεσης
        authMessage.classList.add('hidden');
        googleSignInButton.classList.add('hidden');
        authStatusDiv.textContent = ''; // Καθάρισε το auth-status μήνυμα

        // Έλεγχος κατάστασης πληρωμής
        // ΑΥΤΟ ΠΡΕΠΕΙ ΝΑ ΚΑΝΕΙ ΕΝΑΝ ΑΣΦΑΛΗ ΕΛΕΓΧΟ (ΙΔΑΝΙΚΑ ΣΕ BACKEND/DATABASE)
        checkPaymentStatus(user.uid);

    } else {
        // Ο χρήστης είναι αποσυνδεδεμένος
        console.log('User is signed out');

        // Απόκρυψη πληροφοριών χρήστη
        userInfoDiv.classList.add('hidden');
        userPhotoImg.src = ''; // Καθάρισε την εικόνα
        userNameSpan.textContent = ''; // Καθάρισε το όνομα

        // Εμφάνιση των στοιχείων της ενότητας σύνδεσης
        authMessage.classList.remove('hidden');
        googleSignInButton.classList.remove('hidden');
        authStatusDiv.textContent = 'Παρακαλώ συνδεθείτε.'; // Μήνυμα αποσύνδεσης

        // Κρύψε τις ενότητες πληρωμής και εφαρμογής
        paymentSection.classList.add('hidden');
        appSection.classList.add('hidden');
        // Κρύψε και τα κουμπιά αποσύνδεσης
        signoutButton.classList.add('hidden');
        signoutButtonApp.classList.add('hidden');
    }
});

// Google Sign-In button click handler
googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Προαιρετικά: Πρόσθετα scopes αν τα χρειάζεσαι
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

    // Μπορείς να δείξεις ένα μήνυμα ενώ περιμένεις
    authStatusDiv.textContent = 'Εκκίνηση σύνδεσης με Google...';

    auth.signInWithPopup(provider)
        .then((result) => {
            // Η σύνδεση ήταν επιτυχής. Το user object είναι διαθέσιμο στο onAuthStateChanged listener.
            console.log('Google Sign-In Successful');
            // Το onAuthStateChanged θα αναλάβει να ενημερώσει το UI
        })
        .catch((error) => {
            // Χειρισμός σφαλμάτων.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Google Sign-In Error', errorCode, errorMessage);
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
            // Μπορεί να θέλεις να εμφανίσεις ξανά το κουμπί σύνδεσης αν αποτύχει
            googleSignInButton.classList.remove('hidden');
            authMessage.classList.remove('hidden'); // Επανεμφάνιση αρχικού μηνύματος
        });
});

// Sign-out button handler (στην payment section)
signoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from payment section)');
        // Το onAuthStateChanged listener θα ενημερώσει το UI
    }).catch((error) => {
        console.error('Sign Out Error', error);
        // Εμφάνισε μήνυμα σφάλματος αποσύνδεσης αν χρειάζεται
    });
});

// Sign-out button handler (στην app section)
signoutButtonApp.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from app section)');
        // Το onAuthStateChanged listener θα ενημερώσει το UI
    }).catch((error) => {
        console.error('Sign Out Error', error);
        // Εμφάνισε μήνυμα σφάλματος αποσύνδεσης αν χρειάζεται
    });
});

// --- Payment Logic (ΑΠΑΙΤΕΙ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ) ---

// Placeholder function to check payment status for a user
// ΑΥΤΗ Η ΣΥΝΑΡΤΗΣΗ ΠΡΕΠΕΙ ΝΑ ΕΛΕΓΧΕΙ ΑΣΦΑΛΩΣ ΑΠΟ BACKEND/DATABASE
function checkPaymentStatus(userId) {
    console.log(`Checking payment status for user: ${userId}`);

    // --- ΠΑΡΑΔΕΙΓΜΑ: ΥΠΟΘΕΤΟΥΜΕ ΟΤΙ Ο ΧΡΗΣΤΗΣ ΔΕΝ ΕΧΕΙ ΠΛΗΡΩΣΕΙ ΑΚΟΜΑ ---
    // ΑΥΤΟ ΠΡΕΠΕΙ ΝΑ ΑΛΛΑΞΕΙ! ΠΡΕΠΕΙ ΝΑ ΔΙΑΒΑΖΕΙΣ ΑΠΟ ΤΟ BACKEND/DATABASE.
    const hasPaid = false; // Αυτό πρέπει να είναι δυναμικό!

    if (hasPaid) {
        // Ο χρήστης έχει πληρώσει
        console.log('User has paid. Displaying app section.');
        paymentSection.classList.add('hidden'); // Κρύψε την ενότητα πληρωμής
        appSection.classList.remove('hidden'); // Εμφάνισε την ενότητα εφαρμογής
        signoutButton.classList.add('hidden'); // Κρύψε το αποσύνδεση της payment section
        signoutButtonApp.classList.remove('hidden'); // Εμφάνισε το αποσύνδεση της app section
        paymentStatusDiv.textContent = ''; // Καθαρισε το μήνυμα πληρωμής

        // Αν χρειάζεται να φορτώσεις επιπλέον πράγματα για την εφαρμογή:
        // loadAppContent();

    } else {
        // Ο χρήστης ΔΕΝ έχει πληρώσει
        console.log('User has not paid. Displaying payment section.');
        paymentSection.classList.remove('hidden'); // Εμφάνισε την ενότητα πληρωμής
        appSection.classList.add('hidden'); // Κρύψε την ενότητα εφαρμογής
        signoutButton.classList.remove('hidden'); // Εμφάνισε το αποσύνδεση της payment section
        signoutButtonApp.classList.add('hidden'); // Κρύψε το αποσύνδεση της app section
        paymentStatusDiv.textContent = 'Για να αποκτήσετε πρόσβαση, απαιτείται πληρωμή.';
    }
}

// Viva Wallet payment button click handler
vivaPaymentButton.addEventListener('click', () => {
    // !!! ΠΡΟΣΟΧΗ: Αυτός ο κώδικας είναι μόνο για παράδειγμα.
    // Η ΔΗΜΙΟΥΡΓΙΑ ΠΑΡΑΓΓΕΛΙΑΣ ΣΤΟ VIVA WALLET ΚΑΙ Η ΕΠΕΞΕΡΓΑΣΙΑ ΠΛΗΡΩΜΗΣ
    // ΠΡΕΠΕΙ ΝΑ ΓΙΝΕΙ ΣΕ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ.

    paymentStatusDiv.textContent = 'Εκκίνηση πληρωμής...';

    // Ιδανικά, εδώ θα έκανες ένα fetch request σε ένα backend endpoint.
    // Αυτό το endpoint θα δημιουργούσε την παραγγελία στο Viva Wallet και θα σου επέστρεφε το URL για ανακατεύθυνση.
    /*
    fetch('/api/create-viva-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Πρόσθεσε Firebase Auth token αν χρειάζεται το backend να επαληθεύσει τον χρήστη
             'Authorization': 'Bearer ' + (auth.currentUser ? await auth.currentUser.getIdToken() : '')
        },
        body: JSON.stringify({
            userId: auth.currentUser.uid, // Στέλνεις το User ID στο backend
            amount: 10.00, // Το ποσό της πληρωμής
            description: 'Πρόσβαση στην Εφαρμογή' // Περιγραφή
            // Άλλες απαραίτητες πληροφορίες για την παραγγελία
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        if (data.checkoutUrl) { // Υποθέτουμε ότι το backend σου επιστρέφει ένα URL πληρωμής
            console.log('Redirecting to Viva Wallet:', data.checkoutUrl);
            window.location.href = data.checkoutUrl; // Ανακατεύθυνση στο Viva Wallet
            // Μετά την πληρωμή, το Viva Wallet θα ανακατευθύνει τον χρήστη πίσω σε ένα URL που έχεις ορίσει.
            // Σε αυτό το URL επιστροφής, ΠΡΕΠΕΙ να ελέγξεις την κατάσταση της πληρωμής με ασφάλεια (πάλι σε backend, μέσω Viva Wallet API ή webhook).
        } else {
            paymentStatusDiv.textContent = 'Σφάλμα: Αδυναμία δημιουργίας παραγγελίας πληρωμής.';
            console.error('Backend error creating Viva order', data);
        }
    })
    .catch(error => {
        paymentStatusDiv.textContent = 'Σφάλμα: Αδυναμία επικοινωνίας για την πληρωμή.';
        console.error('Fetch error:', error);
    });
    */

    // --- Για σκοπούς επίδειξης (ΠΡΕΠΕΙ ΝΑ ΑΝΤΙΚΑΤΑΣΤΑΘΕΙ ΜΕ ΤΗΝ ΠΑΡΑΠΑΝΩ ΛΟΓΙΚΗ BACKEND ΚΛΗΣΗΣ) ---
    paymentStatusDiv.textContent = 'Η πληρωμή μέσω Viva Wallet απαιτεί backend integration.';
    console.warn('Viva Wallet payment initiated from frontend placeholder. Implement backend logic!');
    // Μετά από μια (υποτιθέμενη) επιτυχή πληρωμή και **ασφαλή** επιβεβαίωση από το backend:
    // checkPaymentStatus(auth.currentUser.uid); // Κάλεσε ξανά για να δεις αν έχει πληρώσει (αφού ενημερωθεί η κατάσταση στο backend/DB)
});

// --- Application Content Logic (Προαιρετικό) ---
// Αυτή η συνάρτηση μπορεί να καλεστεί όταν ο χρήστης έχει πληρώσει
function loadAppContent() {
    console.log('Loading application specific content...');
    // Εδώ μπορείς να φορτώσεις δυναμικά άλλα scripts, να φέρεις δεδομένα, να εμφανίσεις πολύπλοκο UI.
    // π.χ. const appScript = document.createElement('script');
    // appScript.src = 'path/to/your/main-app.js';
    // document.body.appendChild(appScript);
    // ή να αλλάξεις το innerHTML της appSection
    // appSection.innerHTML = '<h2>Το περιεχόμενο της εφαρμογής σας!</h2><p>Δεδομένα...</p>';
}

// --- Initial Check ---
// Το onAuthStateChanged listener καλείται αυτόματα κατά την φόρτωση της σελίδας
// αν υπάρχει ήδη συνδεδεμένος χρήστης, οπότε ο παρακάτω κώδικας δεν είναι αυστηρά απαραίτητος
// αλλά δεν βλάπτει.

// const currentUser = auth.currentUser;
// if (currentUser) {
//     console.log('User already logged in on page load:', currentUser.uid);
//     // checkPaymentStatus(currentUser.uid); // Το onAuthStateChanged θα το καλέσει ούτως ή άλλως
// } else {
//     console.log('No user logged in on page load.');
// }
