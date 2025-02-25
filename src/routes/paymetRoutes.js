const express = require("express");
const {
  createPreference,
  paymentWebhook,
} = require("../controllers/paymentController");

const router = express.Router();

// Ruta para crear una preferencia de pago
router.post("/", createPreference);

// Ruta para manejar el webhook de notificaciones de pago
router.post("/webhook", paymentWebhook);

module.exports = router;
