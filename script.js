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
const githubSignInButton = document.getElementById('github-signin-button'); // Κουμπί GitHub

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
        // Καθάρισε τα πεδία email/password
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
        // Τα πεδία email/password και τα κουμπιά τους είναι μέσα στο authSection,
        // οπότε θα εμφανιστούν και αυτά.


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
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Google Sign-In Error', errorCode, errorMessage);
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
            // Επαναφορά UI στην κατάσταση πριν τη σύνδεση σε περίπτωση σφάλματος
             authSection.classList.remove('hidden');
             userInfoDiv.classList.add('hidden');
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
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('GitHub Sign-In Error', errorCode, errorMessage);

            // --- Χειρισμός Σφάλματος: auth/account-exists-with-different-credential ---
            if (errorCode === 'auth/account-exists-with-different-credential') {
                const email = error.email; // Παίρνουμε το email από το σφάλμα

                // Χρησιμοποιούμε το fetchSignInMethodsForEmail για να βρούμε
                // ποιες μέθοδοι σύνδεσης χρησιμοποιούνται ήδη για αυτό το email
                auth.fetchSignInMethodsForEmail(email).then((methods) => {
                    let providerMessage = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη. Συνδεθείτε χρησιμοποιώντας: `;
                    if (methods && methods.length > 0) {
                        // Δημιουργούμε ένα φιλικό μήνυμα με βάση τους providers που βρήκαμε
                        providerMessage += methods.map(method => {
                            // Μετατροπή των Firebase provider IDs σε πιο κατανοητά ονόματα
                            if (method === 'google.com') return 'Google';
                            if (method === 'password') return 'Email/Password';
                            if (method === 'github.com') return 'GitHub'; // Δεν πρέπει να συμβεί σε αυτή την περίπτωση
                            // Πρόσθεσε άλλους providers αν χρησιμοποιείς
                            return method; // Επιστροφή του provider ID αν δεν αναγνωριστεί
                        }).join(' ή '); // Ενώνουμε τους providers με "ή"
                    } else {
                         // Εφεδρικό μήνυμα αν για κάποιο λόγο δεν βρεθούν μέθοδοι
                         providerMessage = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη με άλλη μέθοδο σύνδεσης.`;
                    }
                     authStatusDiv.textContent = providerMessage; // Εμφάνιση του μηνύματος στον χρήστη
                     console.warn(providerMessage); // Επίσης στην κονσόλα

                }).catch((fetchError) => {
                    // Χειρισμός σφάλματος αν αποτύχει το fetchSignInMethodsForEmail
                    console.error('Σφάλμα κατά την ανάκτηση μεθόδων σύνδεσης:', fetchError);
                     authStatusDiv.textContent = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη (σφάλμα ελέγχου).`;
                });

            } else {
                // --- Χειρισμός Άλλων Σφαλμάτων Σύνδεσης GitHub ---
                 authStatusDiv.textContent = `Σφάλμα Σύνδεσης GitHub: ${errorMessage}`;
                 console.error('Unhandled GitHub Sign-In error:', errorCode, errorMessage);
            }

             // Πάντα επαναφέρουμε το UI στην κατάσταση πριν τη σύνδεση σε περίπτωση σφάλματος
            authSection.classList.remove('hidden');
            userInfoDiv.classList.add('hidden');
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
             else if (errorCode === 'auth/user-disabled') {
                 authStatusDiv.textContent = 'Αυτός ο λογαριασμός έχει απενεργοποιηθεί.';
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

    // Ασύγχρονη κλήση για να περιμένει το ID Token αν χρειάζεται το backend
  async function createOrder() {
  // Παίρνουμε το token από την Netlify Function
  const tokenResponse = await fetch('/.netlify/functions/get-viva-token');
  const tokenData = await tokenResponse.json();

  if (!tokenData.access_token) {
    console.error('Αποτυχία λήψης token');
    return;
  }

  // Δημιουργούμε την παραγγελία
  const orderResponse = await fetch('/.netlify/functions/create-viva-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ access_token: tokenData.access_token })
  });

  const orderData = await orderResponse.json();

  if (orderData.checkout_url) {
    // Ανακατευθύνουμε τον χρήστη στο Viva Wallet για να ολοκληρώσει την πληρωμή
    window.location.href = orderData.checkout_url;
  } else {
    console.error('Αποτυχία δημιουργίας παραγγελίας');
  }
}


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
