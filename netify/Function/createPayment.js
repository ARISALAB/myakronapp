// netlify/functions/createPayment.js
const axios = require("axios");

exports.handler = async function (event, context) {
  const clientId = "rmjk54vwy5a306687qg9eor9ngeasxe8g2w451k3pq3v5.apps.vivapayments.com";
  const clientSecret = "7s9119DGEF2sk4BCeiB65268MmU8pY";

  try {
    // 1. Απόκτηση access token
    const tokenResponse = await axios.post(
      "https://accounts.vivapayments.com/connect/token",
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

    // 2. Δημιουργία πληρωμής (payment order)
    const paymentResponse = await axios.post(
      "https://api.vivapayments.com/checkout/v2/orders",
      {
        amount: 1000, // σε λεπτά (π.χ. €10.00 -> 1000)
        customer: {
          email: "customer@example.com"
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const redirectUrl = paymentResponse.data.checkout_url;

    return {
      statusCode: 200,
      body: JSON.stringify({ redirectUrl }),
    };
  } catch (err) {
    console.error(err.response?.data || err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Πρόβλημα με την πληρωμή" }),
    };
  }
};
