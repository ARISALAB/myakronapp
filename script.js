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

// Helper function to show/hide elements
function showElement(element) {
    element.classList.remove('hidden');
}

function hideElement(element) {
    element.classList.add('hidden');
}


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
        showElement(userInfoDiv);

        // Κρύψε όλα τα στοιχεία της αρχικής ενότητας σύνδεσης
        hideElement(authSection);
        // Καθάρισε τα πεδία email/password
        emailInput.value = '';
        passwordInput.value = '';

        authStatusDiv.textContent = ''; // Καθάρισε το auth-status μήνυμα

        // Έλεγχος κατάστασης πληρωμής μέσω backend
        checkPaymentStatus(user); // Περνάμε όλο το user object

    } else {
        // Ο χρήστης είναι αποσυνδεδεμένος
        console.log('User is signed out');

        // Απόκρυψη πληροφοριών χρήστη
        hideElement(userInfoDiv);
        userPhotoImg.src = ''; // Καθάρισε την εικόνα
        userNameSpan.textContent = ''; // Καθάρισε το όνομα

        // Εμφάνιση της αρχικής ενότητας σύνδεσης
        showElement(authSection);
        showElement(authMessage); // Εμφάνισε το αρχικό μήνυμα
        showElement(googleSignInButton); // Εμφάνισε το κουμπί Google
        showElement(githubSignInButton); // Εμφάνισε το κουμπί GitHub
        // Τα πεδία email/password και τα κουμπιά τους είναι μέσα στο authSection,
        // οπότε θα εμφανιστούν και αυτά.

        authStatusDiv.textContent = 'Παρακαλώ συνδεθείτε.'; // Μήνυμα αποσύνδεσης

        // Κρύψε τις ενότητες πληρωμής και εφαρμογής
        hideElement(paymentSection);
        hideElement(appSection);
        // Κρύψε και τα κουμπιά αποσύνδεσης
        hideElement(signoutButton);
        hideElement(signoutButtonApp);
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
            // Το onAuthStateChanged θα αναλάβει να ενημερώσει το UI και να ελέγξει την πληρωμή
            authStatusDiv.textContent = 'Επιτυχής σύνδεση!'; // Προσωρινό
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Google Sign-In Error', errorCode, errorMessage);
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
            // Επαναφορά UI στην κατάσταση πριν τη σύνδεση σε περίπτωση σφάλματος
            showElement(authSection);
            hideElement(userInfoDiv);
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
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI και να ελέγξει την πληρωμή.
            console.log('GitHub Sign-In Successful');
             authStatusDiv.textContent = 'Επιτυχής σύνδεση!'; // Προσωρινό
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('GitHub Sign-In Error', errorCode, errorMessage);

            // --- Χειρισμός Σφάλματος: auth/account-exists-with-different-credential ---
            if (errorCode === 'auth/account-exists-with-different-credential') {
                const email = error.email; // Παίρνουμε το email από το σφάλμα

                auth.fetchSignInMethodsForEmail(email).then((methods) => {
                    let providerMessage = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη. Συνδεθείτε χρησιμοποιώντας: `;
                    if (methods && methods.length > 0) {
                        providerMessage += methods.map(method => {
                            if (method === 'google.com') return 'Google';
                            if (method === 'password') return 'Email/Password';
                             if (method === 'github.com') return 'GitHub';
                            return method;
                        }).join(' ή ');
                    } else {
                        providerMessage = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη με άλλη μέθοδο σύνδεσης.`;
                    }
                    authStatusDiv.textContent = providerMessage;
                    console.warn(providerMessage);

                }).catch((fetchError) => {
                    console.error('Σφάλμα κατά την ανάκτηση μεθόδων σύνδεσης:', fetchError);
                    authStatusDiv.textContent = `Ένας λογαριασμός με το email ${email} υπάρχει ήδη (σφάλμα ελέγχου).`;
                });

            } else {
                // --- Χειρισμός Άλλων Σφαλμάτων Σύνδεσης GitHub ---
                authStatusDiv.textContent = `Σφάλμα Σύνδεσης GitHub: ${errorMessage}`;
                console.error('Unhandled GitHub Sign-In error:', errorCode, errorMessage);
            }

            // Πάντα επαναφέρουμε το UI στην κατάσταση πριν τη σύνδεση σε περίπτωση σφάλματος
            showElement(authSection);
            hideElement(userInfoDiv);
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
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI και να ελέγξει την πληρωμή.
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
            } else if (errorCode === 'auth/user-disabled') {
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
            // Το onAuthStateChanged listener θα αναλάβει να ενημερώσει το UI και να ελέγξει την πληρωμή.
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

// Ασφαλής συνάρτηση για τον έλεγχο κατάστασης πληρωμής μέσω BACKEND
async function checkPaymentStatus(user) {
    console.log(`Checking payment status for user: ${user.uid}`);
    paymentStatusDiv.textContent = 'Έλεγχος κατάστασης πληρωμής...'; // Ενημέρωση χρήστη

    try {
        // Παίρνουμε το Firebase Auth ID token για να το στείλουμε στο backend
        // για επαλήθευση του συνδεδεμένου χρήστη
        const idToken = await user.getIdToken();

        // Κάνουμε fetch request στο δικό σου backend endpoint για έλεγχο κατάστασης
        // ΒΕΒΑΙΩΣΟΥ ΟΤΙ ΤΟ URL ΕΙΝΑΙ ΣΩΣΤΟ: "/.netlify/functions/check-payment-status"
        const response = await fetch('/.netlify/functions/check-payment-status', {
            method: 'POST', // Συνήθως POST για αποστολή ID χρήστη, αλλά μπορεί να είναι και GET
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + idToken // Στέλνουμε το token για επαλήθευση
            },
             // Μπορεί να μην χρειάζεται body αν το backend παίρνει το UID από το token
            // Αλλά είναι καλή πρακτική να το στέλνεις και στο body
             body: JSON.stringify({ userId: user.uid })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Backend Payment Status Check Error Response:', response.status, errorBody);
            throw new Error(`Backend error checking payment status: ${response.status} - ${errorBody}`);
        }

        const data = await response.json(); // Υποθέτουμε ότι το backend επιστρέφει JSON όπως { hasPaid: true/false }

        const hasPaid = data.hasPaid || false; // Ασφαλής πρόσβαση στην ιδιότητα, default false

        if (hasPaid) {
            // Ο χρήστης έχει πληρώσει
            console.log('User has paid. Displaying app section.');
            hideElement(paymentSection); // Κρύψε την ενότητα πληρωμής
            showElement(appSection); // Εμφάνισε την ενότητα εφαρμογής
            hideElement(signoutButton); // Κρύψε το αποσύνδεση της payment section
            showElement(signoutButtonApp); // Εμφάνισε το αποσύνδεση της app section
            paymentStatusDiv.textContent = ''; // Καθαρισε το μήνυμα πληρωμής

            // Αν χρειάζεται να φορτώσεις επιπλέον πράγματα για την εφαρμογή:
            // loadAppContent();

        } else {
            // Ο χρήστης ΔΕΝ έχει πληρώσει
            console.log('User has not paid. Displaying payment section.');
            showElement(paymentSection); // Εμφάνισε την ενότητα πληρωμής
            hideElement(appSection); // Κρύψε την ενότητα εφαρμογής
            showElement(signoutButton); // Εμφάνισε το αποσύνδεση της payment section
            hideElement(signoutButtonApp); // Κρύψε το αποσύνδεση της app section
            paymentStatusDiv.textContent = 'Για να αποκτήσετε πρόσβαση, απαιτείται πληρωμή.'; // Μήνυμα πληρωμής
        }
    } catch (error) {
        console.error('Error checking payment status:', error);
        paymentStatusDiv.textContent = `Σφάλμα κατά τον έλεγχο πληρωμής: ${error.message || 'Άγνωστο σφάλμα'}`;
         // Σε περίπτωση σφάλματος, καλό είναι να κρύβουμε και τις δύο ενότητες (πληρωμής/εφαρμογής)
        // και να δείχνουμε μόνο το μήνυμα σφάλματος ή να επιστρέφουμε στην οθόνη σύνδεσης
         // (ανάλογα με το τι θέλεις να συμβεί σε σφάλμα backend)
        hideElement(paymentSection);
        hideElement(appSection);
        hideElement(signoutButton);
        hideElement(signoutButtonApp);
        // auth.signOut(); // Ή μπορείς απλά να τους αποσυνδέεις σε σοβαρό σφάλμα
    }
}


// Viva Wallet payment button click handler
vivaPaymentButton.addEventListener('click', () => {
    // !!! ΠΡΟΣΟΧΗ: Αυτός ο κώδικας είναι μόνο για παράδειγμα.
    // Η ΔΗΜΙΟΥΡΓΙΑ ΠΑΡΑΓΓΕΛΙΑΣ ΣΤΟ VIVA WALLET ΚΑΙ Η ΕΠΕΞΕΡΓΑΣΙΑ ΠΛΗΡΩΜΗΣ
    // ΠΡΕΠΕΙ ΝΑ ΓΙΝΕΙ ΣΕ BACKEND ΓΙΑ ΑΣΦΑΛΕΙΑ.

    paymentStatusDiv.textContent = 'Εκκίνηση πληρωμής...';

    // Ασύγχρονη κλήση για να περιμένει το ID Token και να καλέσει το backend
    (async () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            paymentStatusDiv.textContent = 'Πρέπει να είστε συνδεδεμένοι για να πληρώσετε.';
            console.warn('User tried to pay but is not logged in.');
             // Επαναφορά UI στην κατάσταση πριν την πληρωμή
             showElement(paymentSection);
             hideElement(appSection);
             showElement(signoutButton);
             hideElement(signoutButtonApp);
            return;
        }

        try {
            // Παίρνουμε το Firebase Auth ID token για να το στείλουμε στο backend
            const idToken = await currentUser.getIdToken();

            paymentStatusDiv.textContent = 'Επικοινωνία για δημιουργία παραγγελίας...';

            // Κάνουμε fetch request στο δικό σου backend endpoint (Netlify Function)
            // ΒΕΒΑΙΩΣΟΥ ΟΤΙ ΤΟ URL ΕΙΝΑΙ ΣΩΣΤΟ: "/.netlify/functions/create-viva-order"
            const response = await fetch('/.netlify/functions/create-viva-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + idToken // Στέλνουμε το token
                },
                body: JSON.stringify({
                    userId: currentUser.uid, // Στέλνεις το User ID
                    amount: 10.00, // Στέλνεις το ποσό (μπορεί να είναι δυναμικό)
                    description: 'Πρόσβαση στην Εφαρμογή'
                    // Άλλες απαραίτητες πληροφορίες που χρειάζεται το backend για τη Viva παραγγελία
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error('Backend Order Creation Error Response:', response.status, errorBody);
                throw new Error(`Backend error creating order: ${response.status} - ${errorBody}`);
            }

            const data = await response.json(); // Υποθέτουμε ότι το backend επιστρέφει JSON με checkoutUrl

            if (data.checkoutUrl) {
                console.log('Redirecting to Viva Wallet:', data.checkoutUrl);
                window.location.href = data.checkoutUrl; // Ανακατεύθυνση στον χρήστη

                // Σημείωση: Μετά την ανακατεύθυνση στο Viva Wallet και την ολοκλήρωση της πληρωμής,
                // ο χρήστης θα επιστρέψει στο URL που έχεις ορίσει στις ρυθμίσεις της Viva Wallet εφαρμογής σου.
                // ΣΕ ΑΥΤΟ ΤΟ URL ΕΠΙΣΤΡΟΦΗΣ, ΠΡΕΠΕΙ ΝΑ ΕΛΕΓΞΕΙΣ ΤΗΝ ΚΑΤΑΣΤΑΣΗ ΤΗΣ ΠΛΗΡΩΜΗΣ
                // ΑΣΦΑΛΩΣ (μέσω Viva Wallet API κλήσης από backend ή, ιδανικά, μέσω Viva Wallet Webhooks).
                // Η συνάρτηση checkPaymentStatus(currentUser.uid) θα πρέπει να καλεστεί ξανά
                // αφού η κατάσταση πληρωμής ενημερωθεί στη βάση δεδομένων σου από τον webhook handler.

            } else {
                paymentStatusDiv.textContent = 'Σφάλμα: Η απάντηση από το backend δεν περιέχει URL πληρωμής.';
                console.error('Backend response missing checkoutUrl', data);
                 // Επαναφορά UI στην κατάσταση πριν την πληρωμή
                 showElement(paymentSection);
                 hideElement(appSection);
                 showElement(signoutButton);
                 hideElement(signoutButtonApp);
            }
        } catch (error) {
            // Αυτό το catch πιάνει errors από το fetch request ή τα errors που πετάμε εμείς παραπάνω
            console.error('Fetch or backend error during payment initiation:', error);
            paymentStatusDiv.textContent = `Σφάλμα κατά την εκκίνηση πληρωμής: ${error.message || 'Άγνωστο σφάλμα'}`; // Εμφάνιση μηνύματος σφάλματος
             // Επαναφορά UI στην κατάσταση πριν την πληρωμή
             showElement(paymentSection);
             hideElement(appSection);
             showElement(signoutButton);
             hideElement(signoutButtonApp);
        }
    })(); // Καλεί την ασύγχρονη συνάρτηση αμέσως
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
// (ποια ενότητα φαίνεται) ρυθμίζεται από αυτόν τον listener καλώντας την checkPaymentStatus.
