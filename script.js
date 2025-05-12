// Η δική σου ρύθμιση Firebase
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
// const analytics = firebase.analytics(); // Μπορείς να το χρησιμοποιήσεις αν χρειάζεσαι analytics
// const db = firebase.firestore(); // Αν χρησιμοποιείς Firestore για κατάσταση πληρωμής

// Get references to DOM elements
const authSection = document.getElementById('auth-section');
const paymentSection = document.getElementById('payment-section');
const appSection = document.getElementById('app-section');
const googleSignInButton = document.getElementById('google-signin-button');
const vivaPaymentButton = document.getElementById('viva-payment-button');
const signoutButton = document.getElementById('signout-button'); // Στην payment section
const signoutButtonApp = document.getElementById('signout-button-app'); // Στην app section
const authStatusDiv = document.getElementById('auth-status');
const paymentStatusDiv = document.getElementById('payment-status');

// --- Firebase Authentication ---

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // Ο χρήστης είναι συνδεδεμένος
        authStatusDiv.textContent = `Καλώς ορίσατε, ${user.displayName || user.email}!`;
        authSection.classList.add('hidden'); // Κρύψε την ενότητα σύνδεσης

        // Έλεγχος κατάστασης πληρωμής (Αυτό πρέπει να γίνει με ασφαλή τρόπο, ιδανικά από backend)
        checkPaymentStatus(user.uid); // Λειτουργία που θα υλοποιήσεις
    } else {
        // Ο χρήστης είναι αποσυνδεδεμένος
        authStatusDiv.textContent = 'Παρακαλώ συνδεθείτε.';
        authSection.classList.remove('hidden'); // Εμφάνισε την ενότητα σύνδεσης
        paymentSection.classList.add('hidden'); // Κρύψε τις άλλες ενότητες
        appSection.classList.add('hidden');
        signoutButton.classList.add('hidden'); // Κρύψε και τα κουμπιά αποσύνδεσης
        signoutButtonApp.classList.add('hidden');
    }
});

// Google Sign-In button click handler
googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly'); // Προαιρετικά: Πρόσθετα scopes

    auth.signInWithPopup(provider)
        .then((result) => {
            // Η σύνδεση ήταν επιτυχής. Το user παρακολουθείται από το onAuthStateChanged listener.
            console.log('Google Sign-In Successful', result.user);
        })
        .catch((error) => {
            // Χειρισμός σφαλμάτων.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Google Sign-In Error', errorCode, errorMessage);
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
        });
});

// Sign-out button handlers
signoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from payment section)');
    }).catch((error) => {
        console.error('Sign Out Error', error);
    });
});

signoutButtonApp.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from app section)');
    }).catch((error) => {
        console.error('Sign Out Error', error);
    });
});


// --- Payment Logic (ΑΠΑΙΤΕΙ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ) ---

// Placeholder function to check payment status
// ΑΥΤΟ ΠΡΕΠΕΙ ΝΑ ΕΛΕΓΧΕΙ ΑΣΦΑΛΩΣ ΑΠΟ BACKEND/DATABASE
function checkPaymentStatus(userId) {
    console.log(`Checking payment status for user: ${userId}`);
    // Εδώ θα έκανες μια κλήση στο backend ή θα έλεγχες το Firestore/RTDB
    // για να δεις αν ο χρήστης με αυτό το ID έχει πληρώσει.

    // --- ΠΑΡΑΔΕΙΓΜΑ: ΥΠΟΘΕΤΟΥΜΕ ΟΤΙ Ο ΧΡΗΣΤΗΣ ΔΕΝ ΕΧΕΙ ΠΛΗΡΩΣΕΙ ΑΚΟΜΑ ---
    const hasPaid = false; // Αυτό πρέπει να είναι δυναμικό!

    if (hasPaid) {
        // Ο χρήστης έχει πληρώσει
        paymentSection.classList.add('hidden'); // Κρύψε την ενότητα πληρωμής
        appSection.classList.remove('hidden'); // Εμφάνισε την ενότητα εφαρμογής
        signoutButton.classList.add('hidden'); // Κρύψε το αποσύνδεση της payment section
        signoutButtonApp.classList.remove('hidden'); // Εμφάνισε το αποσύνδεση της app section
        paymentStatusDiv.textContent = ''; // Καθαρισε το μήνυμα πληρωμής
    } else {
        // Ο χρήστης ΔΕΝ έχει πληρώσει
        paymentSection.classList.remove('hidden'); // Εμφάνισε την ενότητα πληρωμής
        appSection.classList.add('hidden'); // Κρύψε την ενότητα εφαρμογής
        signoutButton.classList.remove('hidden'); // Εμφάνισε το αποσύνδεση της payment section
        signoutButtonApp.classList.add('hidden'); // Κρύψε το αποσύνδεση της app section
        paymentStatusDiv.textContent = 'Απαιτείται πληρωμή.';
    }
}

// Viva Wallet payment button click handler
vivaPaymentButton.addEventListener('click', () => {
    // !!! ΠΡΟΣΟΧΗ: Αυτός ο κώδικας είναι μόνο για παράδειγμα.
    // Η ΔΗΜΙΟΥΡΓΙΑ ΠΑΡΑΓΓΕΛΙΑΣ ΣΤΟ VIVA WALLET ΚΑΙ Η ΕΠΕΞΕΡΓΑΣΙΑ ΠΛΗΡΩΜΗΣ
    // ΠΡΕΠΕΙ ΝΑ ΓΙΝΕΙ ΣΕ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ.

    paymentStatusDiv.textContent = 'Εκκίνηση πληρωμής...';

    // Ιδανικά, εδώ θα έκανες ένα fetch request σε ένα backend endpoint.
    // π.χ. fetch('/api/create-viva-order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: auth.currentUser.uid, amount: 10.00 }) })
    // .then(response => response.json())
    // .then(data => {
    //     if (data.checkoutUrl) { // Υποθέτουμε ότι το backend σου επιστρέφει ένα URL πληρωμής
    //         window.location.href = data.checkoutUrl; // Ανακατεύθυνση στο Viva Wallet
    //         // Ή άνοιγμα σε νέο παράθυρο: window.open(data.checkoutUrl, '_blank');
    //     } else {
    //         paymentStatusDiv.textContent = 'Σφάλμα: Αδυναμία δημιουργίας παραγγελίας.';
    //         console.error('Backend error creating Viva order', data);
    //     }
    // })
    // .catch(error => {
    //     paymentStatusDiv.textContent = 'Σφάλμα: Αδυναμία επικοινωνίας με το backend.';
    //     console.error('Network or backend error', error);
    // });

    // --- Εναλλακτικά, ένα ΑΠΛΟ frontend-only παράδειγμα (ΜΗΝ ΤΟ ΧΡΗΣΙΜΟΠΟΙΗΣΕΙΣ ΣΕ ΠΑΡΑΓΩΓΗ) ---
    // Αν υποθέσουμε ότι έχεις ένα test Checkout Form URL από το Viva Wallet
    // const vivaCheckoutUrl = 'YOUR_VIVA_WALLET_CHECKOUT_URL'; // Βάλε το δικό σου URL
    // if (vivaCheckoutUrl && vivaCheckoutUrl !== 'YOUR_VIVA_WALLET_CHECKOUT_URL') {
    //      window.location.href = vivaCheckoutUrl;
    //      // Μετά την πληρωμή, το Viva Wallet θα ανακατευθύνει τον χρήστη πίσω σε ένα URL που έχεις ορίσει
    //      // Στο URL επιστροφής, πρέπει να ελέγξεις την κατάσταση της πληρωμής (Πάλι, ιδανικά σε backend)
    // } else {
    //     paymentStatusDiv.textContent = 'Η ενσωμάτωση Viva Wallet δεν έχει ρυθμιστεί πλήρως.';
    //     console.warn('Viva Wallet Checkout URL not set.');
    // }

    // Για σκοπούς επίδειξης (πρέπει να αντικατασταθεί):
    paymentStatusDiv.textContent = 'Συνδεθείτε με backend για πραγματική πληρωμή Viva Wallet.';
    console.warn('Frontend payment initiation used. Implement backend for security!');
    // Μετά από (υποτιθέμενη) επιτυχή πληρωμή:
    // checkPaymentStatus(auth.currentUser.uid); // Κάλεσε ξανά για να δεις αν έχει πληρώσει
});

// --- Logic για την κατάσταση μετά την πληρωμή ---
// Όταν η πληρωμή επιβεβαιωθεί (αυτό πρέπει να γίνει ΑΣΦΑΛΩΣ),
// η συνάρτηση checkPaymentStatus θα καλεστεί από το onAuthStateChanged
// και θα εμφανίσει την ενότητα app-section.
// Αν χρειάζεσαι να φορτώσεις δυναμικά κάτι μετά την πληρωμή:
function loadAppContent() {
    console.log('Loading application content...');
    // Εδώ μπορείς να φορτώσεις επιπλέον scripts, να φέρεις δεδομένα, κλπ.
    // π.χ. import('./my-app.js').then(module => module.initApp());
    // appSection.innerHTML += '<p>Το περιεχόμενο της εφαρμογής φορτώθηκε.</p>'; // Προσθήκη περιεχομένου
}

// Call checkPaymentStatus initially if user is already logged in on page load
if (auth.currentUser) {
    checkPaymentStatus(auth.currentUser.uid);
}

// Λόγω του onAuthStateChanged, η λογική checkPaymentStatus τρέχει
// κάθε φορά που αλλάζει η κατάσταση σύνδεσης (συμπεριλαμβανομένου
// της αρχικής φόρτωσης αν ο χρήστης είναι ήδη συνδεδεμένος).
