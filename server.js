/**
 * =============================================================================
 * PAELLA PI — server.js
 * Backend ligero en Node.js/Express para aprobar y completar pagos con la
 * API REST de Pi Network (Testnet / Sandbox).
 *
 * Flujo:
 *  1. Frontend crea el pago con Pi.createPayment().
 *  2. onReadyForServerApproval -> POST /api/approve-payment
 *     -> este server llama a Pi Platform API para aprobar el pago.
 *  3. Usuario confirma en Pi Browser, la blockchain procesa el pago.
 *  4. onReadyForServerCompletion -> POST /api/complete-payment
 *     -> este server llama a Pi Platform API para completar el pago,
 *        pasando el txid de la blockchain.
 *
 * Requiere variable de entorno:
 *   PI_API_KEY   -> Tu API Key de Pi Developer Portal (Sandbox/Testnet)
 *
 * Instalación:
 *   npm init -y
 *   npm install express axios cors dotenv
 *   node server.js
 * =============================================================================
 */

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// -----------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------
const PI_API_KEY = process.env.PI_API_KEY || "REPLACE_WITH_YOUR_PI_API_KEY";
const PI_API_BASE = "https://api.minepi.com/v2";

// In-memory store of payments known to this server (for demo/testnet purposes).
// In production, persist this in a real database (Firestore, Postgres, etc.)
const paymentsDB = new Map();

// -----------------------------------------------------------------------
// MIDDLEWARE
// -----------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // sirve index.html estático

function piHeaders(){
  return {
    Authorization: `Key ${PI_API_KEY}`,
    "Content-Type": "application/json"
  };
}

// -----------------------------------------------------------------------
// POST /api/approve-payment
// Aprueba un pago pendiente en el lado del servidor. Obligatorio antes de
// que el usuario pueda confirmarlo en la app de Pi.
// -----------------------------------------------------------------------
app.post("/api/approve-payment", async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId){
    return res.status(400).json({ error: "Missing paymentId" });
  }

  try {
    const response = await axios.post(
      `${PI_API_BASE}/payments/${paymentId}/approve`,
      {},
      { headers: piHeaders() }
    );

    paymentsDB.set(paymentId, { status: "approved", data: response.data });

    console.log(`✅ Payment approved: ${paymentId}`);
    return res.status(200).json({ success: true, payment: response.data });

  } catch (err) {
    console.error("❌ Error approving payment:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to approve payment",
      details: err.response?.data || err.message
    });
  }
});

// -----------------------------------------------------------------------
// POST /api/complete-payment
// Completa un pago ya aprobado, una vez que la transacción fue enviada
// a la blockchain de Pi (requiere el txid devuelto por el SDK frontend).
// -----------------------------------------------------------------------
app.post("/api/complete-payment", async (req, res) => {
  const { paymentId, txid } = req.body;

  if (!paymentId || !txid){
    return res.status(400).json({ error: "Missing paymentId or txid" });
  }

  try {
    const response = await axios.post(
      `${PI_API_BASE}/payments/${paymentId}/complete`,
      { txid },
      { headers: piHeaders() }
    );

    paymentsDB.set(paymentId, { status: "completed", data: response.data, txid });

    console.log(`✅ Payment completed: ${paymentId} (txid: ${txid})`);
    return res.status(200).json({ success: true, payment: response.data });

  } catch (err) {
    console.error("❌ Error completing payment:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to complete payment",
      details: err.response?.data || err.message
    });
  }
});

// -----------------------------------------------------------------------
// GET /api/payment/:paymentId  (utilidad opcional para depurar/consultar)
// -----------------------------------------------------------------------
app.get("/api/payment/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  try {
    const response = await axios.get(
      `${PI_API_BASE}/payments/${paymentId}`,
      { headers: piHeaders() }
    );
    return res.status(200).json(response.data);
  } catch (err) {
    console.error("❌ Error fetching payment:", err.response?.data || err.message);
    return res.status(500).json({
      error: "Failed to fetch payment",
      details: err.response?.data || err.message
    });
  }
});

// -----------------------------------------------------------------------
// Health check
// -----------------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "Paella Pi backend", time: new Date().toISOString() });
});

// -----------------------------------------------------------------------
// Fallback: sirve index.html para cualquier ruta no-API (SPA-style)
// -----------------------------------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// -----------------------------------------------------------------------
// START SERVER
// -----------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🥘 Paella Pi backend running on http://localhost:${PORT}`);
  console.log(`   PI_API_KEY loaded: ${PI_API_KEY.startsWith("REPLACE") ? "❌ NOT SET (using placeholder)" : "✅ Yes"}`);
});
