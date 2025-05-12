// functions/get-viva-token.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;
  const url = 'https://demo.vivapayments.com/connect/token';

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'payment'
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const data = await response.json();
    if (data.error) {
      return {
        statusCode: 400,
        body: JSON.stringify(data)
      };
    }

    // Επιστρέφουμε το token
    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: data.access_token })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
