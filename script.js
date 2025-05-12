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
const githubSignInButton = document.getElementById('github-signin-button'); // Νέο κουμπί GitHub

const emailInput = document.getElementById('email-input'); // Πεδίο Email
const passwordInput = document.getElementById('password-input'); // Πεδίο Password
const emailSignInButton = document.getElementById('email-signin-button'); // Κουμπί Σύνδεσης Email
const emailSignUpButton = document.getElementById('email-signup-button'); // Κουμπί Εγγραφής Email

const userInfoDiv = document.getElementById('user-info'); // Container για info χρήστη
const userPhotoImg = document.getElementById('user-photo'); // Φωτογραφία χρήστη
const userNameSpan = document.getElementById('user-name'); // Όνομα χρήστη

const vivaPaymentButton = document.getElementById('viva-payment-button');
const signoutButton = document.getElementById('signout-button'); // Κουμπί αποσύνδεσης στην payment section
const signoutButtonApp = document.getElementById('signout-button-app'); // Κουμπί αποσύνδεσης στην app section

const authStatusDiv = document.getElementById('auth-status'); // Για προσωρινά μηνύματα κατά τη διαδικασία σύνδεσης/εγγραφής
const paymentStatusDiv = document.getElementById('payment-status'); // Για μηνύματα πληρωμής

// --- Firebase Authentication State Listener ---

// Αυτή η συνάρτηση καλείται κάθε φορά που αλλάζει η κατάσταση σύνδεσης (σύνδεση, αποσύνδεση, φόρτωση σελίδας)
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

        // Κρύψε όλα τα στοιχεία της αρχικής ενότητας σύνδεσης
        authSection.classList.add('hidden');
        // Μπορείς να καθαρίσεις και τα πεδία email/password εδώ αν θέλεις
        emailInput.value = '';
        passwordInput.value = '';


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

        // Εμφάνιση της αρχικής ενότητας σύνδεσης
        authSection.classList.remove('hidden');
        authMessage.classList.remove('hidden'); // Εμφάνισε το αρχικό μήνυμα
        googleSignInButton.classList.remove('hidden'); // Εμφάνισε το κουμπί Google
        githubSignInButton.classList.remove('hidden'); // Εμφάνισε το κουμπί GitHub
        // Δεν χρειάζεται να εμφανίσουμε τη φόρμα email/password ρητά αν είναι ήδη μέσα στο authSection
        // που εμφανίζεται τώρα.

        authStatusDiv.textContent = 'Παρακαλώ συνδεθείτε.'; // Μήνυμα αποσύνδεσης

        // Κρύψε τις ενότητες πληρωμής και εφαρμογής
        paymentSection.classList.add('hidden');
        appSection.classList.add('hidden');
        // Κρύψε και τα κουμπιά αποσύνδεσης
        signoutButton.classList.add('hidden');
        signoutButtonApp.classList.add('hidden');
        paymentStatusDiv.textContent = ''; // Καθάρισε το μήνυμα πληρωμής
    }
});

// --- Authentication Button Handlers ---

// Google Sign-In button click handler
googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    // Προαιρετικά: Πρόσθετα scopes αν τα χρειάζεσαι
    // provider.addScope('https://www.googleapis.com/auth/contacts.readonly');

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
            // Επαναφορά UI στην κατάσταση πριν τη σύνδεση
            authSection.classList.remove('hidden'); // Εμφάνιση αρχικής ενότητας
            userInfoDiv.classList.add('hidden'); // Απόκρυψη info χρήστη αν εμφανίστηκε προσωρινά
        });
});

// GitHub Sign In button click handler
githubSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GithubAuthProvider();
    // Προαιρετικά: Πρόσθετα scopes αν τα χρειάζεσαι
    // provider.addScope('read:user'); // Για να διαβάσεις δημόσια στοιχεία χρήστη GitHub

    authStatusDiv.textContent = 'Εκκίνηση σύνδεσης με GitHub...';

    auth.signInWithPopup(provider)
        .then((result) => {
            // Σύνδεση επιτυχής.
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI.
            console.log('GitHub Sign-In Successful');
        })
        .catch((error) => {
            // Χειρισμός σφαλμάτων.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('GitHub Sign-In Error', errorCode, errorMessage);
             authStatusDiv.textContent = `Σφάλμα Σύνδεσης GitHub: ${errorMessage}`;
             // Επαναφορά UI στην κατάσταση πριν τη σύνδεση
            authSection.classList.remove('hidden'); // Εμφάνιση αρχικής ενότητας
            userInfoDiv.classList.add('hidden'); // Απόκρυψη info χρήστη αν εμφανίστηκε προσωρινά
        });
});


// Email Sign In button click handler
emailSignInButton.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
        authStatusDiv.textContent = 'Παρακαλώ συμπληρώστε email και κωδικό.';
        return;
    }

    authStatusDiv.textContent = 'Σύνδεση με email...';

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Σύνδεση επιτυχής. Ο χρήστης είναι διαθέσιμος στο userCredential.user.
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI.
            console.log('Email Sign-In Successful');
            // Τα πεδία καθαρίζονται στο onAuthStateChanged
            authStatusDiv.textContent = 'Επιτυχής σύνδεση!'; // Προσωρινό μήνυμα
        })
        .catch((error) => {
            // Χειρισμός σφαλμάτων.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Email Sign-In Error', errorCode, errorMessage);
            // Εμφάνιση πιο φιλικών μηνυμάτων σφάλματος
            if (errorCode === 'auth/user-not-found') {
                authStatusDiv.textContent = 'Δεν υπάρχει χρήστης με αυτό το email.';
            } else if (errorCode === 'auth/wrong-password') {
                 authStatusDiv.textContent = 'Λάθος κωδικός.';
            } else if (errorCode === 'auth/invalid-email') {
                 authStatusDiv.textContent = 'Μη έγκυρη διεύθυνση email.';
            }
            else {
                 authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
            }
        });
});

// Email Sign Up button click handler
emailSignUpButton.addEventListener('click', () => {
     const email = emailInput.value;
     const password = passwordInput.value;

     if (!email || !password) {
         authStatusDiv.textContent = 'Παρακαλώ συμπληρώστε email και κωδικό για εγγραφή.';
         return;
     }

     authStatusDiv.textContent = 'Εγγραφή με email...';

     auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Εγγραφή επιτυχής. Ο χρήστης είναι διαθέσιμος στο userCredential.user.
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI.
            console.log('Email Sign-Up Successful');
             // Τα πεδία καθαρίζονται στο onAuthStateChanged
            authStatusDiv.textContent = 'Επιτυχής εγγραφή και σύνδεση!'; // Προσωρινό μήνυμα
            // Προαιρετικά: Ζήτα από το χρήστη να επαληθεύσει το email του
            // userCredential.user.sendEmailVerification().then(() => {
            //     console.log('Email verification sent.');
            // }).catch(error => {
            //     console.error('Error sending email verification:', error);
            // });
        })
        .catch((error) => {
            // Χειρισμός σφαλμάτων.
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Email Sign-Up Error', errorCode, errorMessage);
            // Εμφάνιση πιο φιλικών μηνυμάτων σφάλματος
             if (errorCode === 'auth/email-already-in-use') {
                authStatusDiv.textContent = 'Αυτό το email χρησιμοποιείται ήδη.';
            } else if (errorCode === 'auth/weak-password') {
                 authStatusDiv.textContent = 'Ο κωδικός πρέπει να είναι τουλάχιστον 6 χαρακτήρες.';
            } else if (errorCode === 'auth/invalid-email') {
                 authStatusDiv.textContent = 'Μη έγκυρη διεύθυνση email.';
            }
            else {
                 authStatusDiv.textContent = `Σφάλμα Εγγραφής: ${errorMessage}`;
            }
        });
});

// Sign-out button handler (στην payment section)
signoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from payment section)');
        // Το onAuthStateChanged listener θα ενημερώσει το UI
    }).catch((error) => {
        console.error('Sign Out Error', error);
        authStatusDiv.textContent = `Σφάλμα Αποσύνδεσης: ${error.message}`;
    });
});

// Sign-out button handler (στην app section)
signoutButtonApp.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out (from app section)');
        // Το onAuthStateChanged listener θα ενημερώσει το UI
    }).catch((error) => {
        console.error('Sign Out Error', error);
        authStatusDiv.textContent = `Σφάλμα Αποσύνδεσης: ${error.message}`;
    });
});


// --- Payment Logic (ΑΠΑΙΤΕΙ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ) ---

// Placeholder function to check payment status for a user
// ΑΥΤΗ Η ΣΥΝΑΡΤΗΣΗ ΠΡΕΠΕΙ ΝΑ ΕΛΕΓΧΕΙ ΑΣΦΑΛΩΣ ΑΠΟ BACKEND/DATABASE
function checkPaymentStatus(userId) {
    console.log(`Checking payment status for user: ${userId}`);

    // Εδώ θα έκανες μια κλήση στο backend ή θα διάβαζες από το Firestore/RTDB
    // για να δεις αν ο χρήστης με αυτό το ID έχει πληρώσει.

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
    // Ασύγχρονη κλήση για να περιμένει το ID Token αν χρειάζεται το backend
    (async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            paymentStatusDiv.textContent = 'Πρέπει να είστε συνδεδεμένοι για να πληρώσετε.';
            console.warn('User tried to pay but is not logged in.');
            return;
        }

        try {
            const idToken = await currentUser.getIdToken(); // Παίρνει το Firebase Auth ID token
            const response = await fetch('/api/create-viva-order', { // Αντικατάστησε με το δικό σου URL backend
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken // Στέλνει το token για επαλήθευση στο backend
                },
                body: JSON.stringify({
                    userId: currentUser.uid, // Στέλνεις το User ID στο backend (redundant αν στέλνεις token, αλλά καλή πρακτική)
                    amount: 10.00, // Το ποσό της πληρωμής
                    description: 'Πρόσβαση στην Εφαρμογή' // Περιγραφή
                    // Άλλες απαραίτητες πληροφορίες για την παραγγελία
                })
            });

            if (!response.ok) {
                const errorBody = await response.text(); // Προσπάθησε να διαβάσεις το σφάλμα από το body
                throw new Error(`Backend error: ${response.status} ${response.statusText} - ${errorBody}`);
            }

            const data = await response.json();

            if (data.checkoutUrl) { // Υποθέτουμε ότι το backend σου επιστρέφει ένα URL πληρωμής
                console.log('Redirecting to Viva Wallet:', data.checkoutUrl);
                window.location.href = data.checkoutUrl; // Ανακατεύθυνση στο Viva Wallet
                // Μετά την πληρωμή, το Viva Wallet θα ανακατευθύνει τον χρήστη πίσω σε ένα URL που έχεις ορίσει.
                // Σε αυτό το URL επιστροφής, ΠΡΕΠΕΙ να ελέξεις την κατάσταση της πληρωμής με ασφάλεια (πάλι σε backend, μέσω Viva Wallet API ή webhook).
            } else {
                paymentStatusDiv.textContent = 'Σφάλμα: Η απάντηση από το backend δεν περιέχει URL πληρωμής.';
                console.error('Backend response missing checkoutUrl', data);
            }
        } catch (error) {
            paymentStatusDiv.textContent = 'Σφάλμα κατά την εκκίνηση πληρωμής.';
            console.error('Fetch or backend error:', error);
        }
    })(); // Αυτό καλεί την ασύγχρονη συνάρτηση αμέσως
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

// Σημείωση: Το onAuthStateChanged listener καλείται αυτόματα κατά την φόρτωση της σελίδας
// αν υπάρχει ήδη συνδεδεμένος χρήστης, οπότε η αρχική κατάσταση του UI
// (ποια ενότητα φαίνεται) ρυθμίζεται από αυτόν τον listener.
