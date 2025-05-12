const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  const clientId = process.env.VIVA_CLIENT_ID;
  const clientSecret = process.env.VIVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing client credentials' }),
    };
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://accounts.vivapayments.com/connect/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'payments orders',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viva token error response:', errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to get access token from Viva' }),
      };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify({ access_token: data.access_token }),
    };
  } catch (error) {
    console.error('Token fetch failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
