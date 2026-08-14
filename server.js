/**
 * Servidor Backend en Node.js/Express para Paella Pi dApp.
 * Interactúa con la REST API v2 de Pi Network para Aprobar y Completar Pagos.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// Clave API de la App en Pi Developer Portal
const PI_API_KEY = process.env.PI_API_KEY || "TU_PI_API_SECRET_KEY_AQUI";
const PI_API_URL = "https://api.minepi.com/v2";

/**
 * Endpoint: /api/approve-payment
 * Llamado cuando el frontend activa 'onReadyForServerApproval'
 */
app.post('/api/approve-payment', async (req, res) => {
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

    console.log(`[PAELLA PI] Pago ${paymentId} APROBADO con éxito.`);
    return res.status(200).json({ success: true, payment: data });

  } catch (error) {
    console.error("Error interno en approve-payment:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

/**
 * Endpoint: /api/complete-payment
 * Llamado cuando el frontend activa 'onReadyForServerCompletion' (después de la firma blockchain)
 */
app.post('/api/complete-payment', async (req, res) => {
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

    console.log(`[PAELLA PI] Pago ${paymentId} COMPLETADO con TXID: ${txid}`);
    return res.status(200).json({ success: true, payment: data });

  } catch (error) {
    console.error("Error interno en complete-payment:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Inicialización del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  🥘==========================================🥘
   Servidor Paella Pi activo en el puerto ${PORT}
   Pi API Endpoint: ${PI_API_URL}
  🥘==========================================🥘
  `);
});
