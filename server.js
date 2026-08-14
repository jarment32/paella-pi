const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());
app.use(express.static('.'));

app.post('/api/authenticate', async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Missing access token' });
  }

  try {
    const response = await axios.get('https://api.minepi.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const piUserData = response.data;

    return res.status(200).json({
      message: 'Authenticated successfully',
      user: piUserData
    });
  } catch (error) {
    console.error('Pi Token Validation Error:', error.response ? error.response.data : error.message);
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});