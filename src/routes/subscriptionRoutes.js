const express = require("express");
const {
  createSubscription,
  handleSubscriptionWebhook,
} = require("../controllers/subscriptionController");

const router = express.Router();

// Ruta para crear una suscripción
router.post("/", createSubscription);

// Ruta para manejar el webhook de notificaciones de suscripción
router.post("/webhook", handleSubscriptionWebhook);

module.exports = router;
