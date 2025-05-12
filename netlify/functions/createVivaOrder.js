const axios = require('axios');

exports.handler = async (event) => {
  try {
    const { VIVA_MERCHANT_ID, VIVA_API_KEY } = process.env;

    const payload = {
      amount: 500, // Π.χ. 5 ευρώ (σε λεπτά)
      customerTrns: "Πληρωμή για χρήση εφαρμογής",
      customer: {
        email: "customer@example.com"
      },
      paymentTimeout: 300,
      preauth: false,
      allowRecurring: false,
      maxInstallments: 1,
      disableCash: false,
      disableWallet: false,
      sourceCode: "Default"
    };

    const response = await axios.post(
      `https://demo.vivapayments.com/api/orders`,
      payload,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${VIVA_MERCHANT_ID}:${VIVA_API_KEY}`).toString("base64")}`,
          "Content-Type": "application/json"
        }
      }
    );

    const orderCode = response.data.orderCode;
    const checkoutUrl = `https://demo.vivapayments.com/web/checkout?ref=${orderCode}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ checkoutUrl })
    };

  } catch (error) {
    console.error("Error creating Viva order:", error.response?.data || error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create order" })
    };
  }
};
