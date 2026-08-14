const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('.'));

const PI_NETWORK_API_KEY = process.env.PI_NETWORK_API_KEY || 'aqmrczbo4eee3qohhmsn2ivtaytk7grtp6g7kc8rb4cvqkbhmeddvhrprutkekmv';
const PI_API_BASE_URL = 'https://api.minepi.com/v2';

app.post('/api/authenticate', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing access token' });
  }

  try {
    const response = await axios.get(`${PI_API_BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return res.status(200).json({
      message: 'Authenticated successfully',
      user: response.data
    });
  } catch (error) {
    console.error('Pi Token Validation Error:', error.response ? error.response.data : error.message);
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
});

app.post('/api/payments/approve', async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Missing paymentId' });
  }

  try {
    const response = await axios.post(
      `${PI_API_BASE_URL}/payments/${paymentId}/approve`,
      {},
      {
        headers: {
          Authorization: `Key ${PI_NETWORK_API_KEY}`
        }
      }
    );

    return res.status(200).json({ message: 'Payment approved', data: response.data });
  } catch (error) {
    console.error('Payment Approval Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to approve payment' });
  }
});

app.post('/api/payments/complete', async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: 'Missing paymentId or txid' });
  }

  try {
    const response = await axios.post(
      `${PI_API_BASE_URL}/payments/${paymentId}/complete`,
      { txid },
      {
        headers: {
          Authorization: `Key ${PI_NETWORK_API_KEY}`
        }
      }
    );

    return res.status(200).json({ message: 'Payment completed', data: response.data });
  } catch (error) {
    console.error('Payment Completion Error:', error.response ? error.response.data : error.message);
    return res.status(500).json({ error: 'Failed to complete payment' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
