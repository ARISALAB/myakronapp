payBtn.onclick = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Δεν είστε συνδεδεμένος.");
    return;
  }

  const idToken = await user.getIdToken(); // 🔐 Πάρε το Firebase ID Token

  fetch('/.netlify/functions/createVivaOrder', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`, // ✅ Στείλε το token στον server
    },
    body: JSON.stringify({
      email: user.email,
      fullName: user.displayName
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    } else {
      alert("Σφάλμα στη δημιουργία πληρωμής");
    }
  })
  .catch(err => {
    console.error("Σφάλμα στο fetch:", err);
    alert("Αποτυχία σύνδεσης με server");
  });
};
