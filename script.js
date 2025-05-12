// --- Firebase Configuration ---
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

auth.onAuthStateChanged(user => {
    if (user) {
        console.log('User is signed in:', user.uid);
        userPhotoImg.src = user.photoURL || '';
        userNameSpan.textContent = user.displayName || user.email || 'Χρήστης';
        userInfoDiv.classList.remove('hidden');
        authSection.classList.add('hidden');
        emailInput.value = '';
        passwordInput.value = '';
        authStatusDiv.textContent = '';
        checkPaymentStatus(user.uid);
    } else {
        console.log('User is signed out');
        userInfoDiv.classList.add('hidden');
        userPhotoImg.src = '';
        userNameSpan.textContent = '';
        authSection.classList.remove('hidden');
        authMessage.classList.remove('hidden');
        googleSignInButton.classList.remove('hidden');
        githubSignInButton.classList.remove('hidden');
        authStatusDiv.textContent = 'Παρακαλώ συνδεθείτε.';
        paymentSection.classList.add('hidden');
        appSection.classList.add('hidden');
        signoutButton.classList.add('hidden');
        signoutButtonApp.classList.add('hidden');
        paymentStatusDiv.textContent = '';
    }
});

// --- Authentication Button Handlers ---

googleSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    authStatusDiv.textContent = 'Εκκίνηση σύνδεσης με Google...';

    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('Google Sign-In Successful');
        })
        .catch((error) => {
            const errorMessage = error.message;
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
            authSection.classList.remove('hidden');
            userInfoDiv.classList.add('hidden');
        });
});

githubSignInButton.addEventListener('click', () => {
    const provider = new firebase.auth.GithubAuthProvider();
    authStatusDiv.textContent = 'Εκκίνηση σύνδεσης με GitHub...';

    auth.signInWithPopup(provider)
        .then((result) => {
            console.log('GitHub Sign-In Successful');
        })
        .catch((error) => {
            const errorMessage = error.message;
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης GitHub: ${errorMessage}`;
            authSection.classList.remove('hidden');
            userInfoDiv.classList.add('hidden');
        });
});

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
            console.log('Email Sign-In Successful');
            authStatusDiv.textContent = 'Επιτυχής σύνδεση!';
        })
        .catch((error) => {
            const errorMessage = error.message;
            authStatusDiv.textContent = `Σφάλμα Σύνδεσης: ${errorMessage}`;
        });
});

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
            console.log('Email Sign-Up Successful');
            authStatusDiv.textContent = 'Επιτυχής εγγραφή και σύνδεση!';
        })
        .catch((error) => {
            const errorMessage = error.message;
            authStatusDiv.textContent = `Σφάλμα Εγγραφής: ${errorMessage}`;
        });
});

// --- Sign-out button handlers ---
signoutButton.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out');
    }).catch((error) => {
        authStatusDiv.textContent = `Σφάλμα Αποσύνδεσης: ${error.message}`;
    });
});

signoutButtonApp.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log('User Signed Out');
    }).catch((error) => {
        authStatusDiv.textContent = `Σφάλμα Αποσύνδεσης: ${error.message}`;
    });
});

// --- Payment Logic ---
function checkPaymentStatus(userId) {
    console.log(`Checking payment status for user: ${userId}`);
    const hasPaid = false;  // This should be checked dynamically from a backend or database.

    if (hasPaid) {
        paymentSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        signoutButton.classList.add('hidden');
        signoutButtonApp.classList.remove('hidden');
        paymentStatusDiv.textContent = '';
    } else {
        paymentSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        signoutButton.classList.remove('hidden');
        signoutButtonApp.classList.add('hidden');
        paymentStatusDiv.textContent = 'Για να αποκτήσετε πρόσβαση, απαιτείται πληρωμή.';
    }
}

// Viva Wallet payment button click handler
vivaPaymentButton.addEventListener('click', async () => {
    paymentStatusDiv.textContent = 'Εκκίνηση πληρωμής...';

    try {
        const tokenResponse = await fetch('/.netlify/functions/get-viva-token');
        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('Αποτυχία λήψης token');
            return;
        }

        const orderResponse = await fetch('/.netlify/functions/create-viva-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: tokenData.access_token,
                amount: 100, // Παράδειγμα ποσού
            }),
        });

        const orderData = await orderResponse.json();

        if (orderData.checkout_url) {
            window.location.href = orderData.checkout_url;
        } else {
            console.error('Αποτυχία δημιουργίας παραγγελίας στο Viva Wallet');
        }
    } catch (error) {
        paymentStatusDiv.textContent = 'Αποτυχία σύνδεσης με το Viva Wallet.';
        console.error('Σφάλμα πληρωμής:', error);
    }
});
