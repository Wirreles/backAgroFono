const express = require("express");
const {
  createPreference,
  paymentWebhook,
  createOrder, 
  captureOrder
} = require("../controllers/paymentController");

const router = express.Router();

// Ruta para crear una preferencia de pago
router.post("/", createPreference);

// Ruta para manejar el webhook de notificaciones de pago
router.post("/webhook", paymentWebhook);

router.post('/paypal/create-order', createOrder);
router.post('/paypal/capture-order', captureOrder);

module.exports = router;
