const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_API_URL = "https://api.minepi.com/v2";

/**
 * Helper to verify Pi access token by calling GET https://api.minepi.com/v2/me
 * No Pi Network API key required for user validation via Bearer token.
 */
async function verifyPiAccessToken(accessToken) {
  if (!accessToken) throw new Error("Access token missing.");

  const response = await fetch(`${PI_API_URL}/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const userData = await response.json();

  if (!response.ok) {
    throw new Error(userData.message || "Failed to authenticate with Pi Network API.");
  }

  return userData;
}

/**
 * Middleware to protect routes that require user authentication
 */
async function authenticateUserMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Missing or invalid authorization header." });
  }

  const token = authHeader.split(' ')[1];
  try {
    const user = await verifyPiAccessToken(token);
    req.piUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

/**
 * Endpoint: /api/verify-user
 * Verifies access token from frontend and returns user data to establish session
 */
app.post('/api/verify-user', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const userData = await verifyPiAccessToken(accessToken);
    console.log(`[PAELLA PI] User authenticated: @${userData.username} (${userData.uid})`);
    return res.status(200).json({ success: true, user: userData });
  } catch (error) {
    console.error("User verification failed:", error.message);
    return res.status(401).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint: /api/approve-payment
 */
app.post('/api/approve-payment', authenticateUserMiddleware, async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: "Falta el paymentId en la solicitud." });
  }

  try {
    const response = await fetch(`${PI_API_URL}/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error aprobando pago en Pi Server:", data);
      return res.status(response.status).json(data);
    }

    console.log(`[PAELLA PI] Pago ${paymentId} APROBADO para @${req.piUser.username}.`);
    return res.status(200).json({ success: true, payment: data });

  } catch (error) {
    console.error("Error interno en approve-payment:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

/**
 * Endpoint: /api/complete-payment
 */
app.post('/api/complete-payment', authenticateUserMiddleware, async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid) {
    return res.status(400).json({ error: "Faltan datos requeridos (paymentId, txid)." });
  }

  try {
    const response = await fetch(`${PI_API_URL}/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error completando pago en Pi Server:", data);
      return res.status(response.status).json(data);
    }

    console.log(`[PAELLA PI] Pago ${paymentId} COMPLETADO para @${req.piUser.username} con TXID: ${txid}`);
    return res.status(200).json({ success: true, payment: data });

  } catch (error) {
    console.error("Error interno en complete-payment:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🥘==========================================🥘
   Servidor Paella Pi activo en el puerto ${PORT}
   Pi API Endpoint: ${PI_API_URL}
  🥘==========================================🥘
  `);
});
