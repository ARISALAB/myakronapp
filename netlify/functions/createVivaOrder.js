const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Get user data from frontend (optional)
  const { email = "customer@example.com", fullName = "Customer" } = JSON.parse(event.body);

  const merchantId = "64e2f74e-d8f5-4d90-be5c-1f805fb1e41e";
  const apiKey = "+jjNx2";
  const sourceCode = "1234"; // ✅ Βεβαιώσου ότι υπάρχει στο Viva Dashboard

  const amount = 500; // Amount in cents => 5.00€

  const orderData = {
    amount: amount,
    customerTrns: "Πρόσβαση στην εφαρμογή",
    customer: {
      email: email,
      fullName: fullName,
      phone: "+306900000000",
      countryCode: "GR",
      requestLang: "el-GR"
    },
    sourceCode: sourceCode,
    paymentTimeout: 300,
    disableWallet: false,
    disableCash: true,
    merchantTrns: "Πρόσβαση στην εφαρμογή RestaurantFinanceApp",
    preauth: false,
    allowRecurring: false
  };

  try {
    const response = await fetch("https://demo.vivapayments.com/api/orders", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(`${merchantId}:${apiKey}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "Viva API error", details: errorText }),
      };
    }

    const result = await response.json();
    const orderCode = result.orderCode;

    const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${orderCode}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error", details: error.message }),
    };
  }
};
