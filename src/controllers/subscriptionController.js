const { db } = require("../firebase");
const { mpSub } = require("../mercadopago");
const mercadopago = require("mercadopago");

const Preapproval = new mercadopago.PreApproval(mpSub);

const createSubscription = async (req, res) => {
  const { email, userId, price, plan } = req.body; // Agregar el campo "plan"
  if (!email || !price || !plan) { // Validar que el plan esté presente
    return res.status(400).json({ error: "Los campos email, price y plan son obligatorios." });
  }

  try {
    const body = {
      reason: `Suscripción ${plan}`, // Usar el plan en el motivo
      external_reference: userId,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: price,
        currency_id: "ARS",
      },
      payer_email: email,
      back_url: "https://servido.com.ar/",
      notification_url: "https://backservido.onrender.com/subscription/webhook",
      status: "pending",
    };

    const response = await Preapproval.create({ body });

    const subscriptionRef = db.collection("subscriptions").doc();
    await subscriptionRef.set({
      email,
      subscriptionId: response.id,
      subId: subscriptionRef.id,
      price, // Guardar el precio en Firestore
      plan, // Guardar el plan en Firestore
      createdAt: new Date().toISOString(),
      userId,
    });

    return res.status(200).json({ init_point: response.init_point });
  } catch (error) {
    console.error("Error creando la suscripción:", error);
    return res.status(500).json({ error: "Error creando la suscripción." });
  }
};

// Manejar el webhook de suscripción
const handleSubscriptionWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!data || !data.id) {
      console.error("Payload del webhook inválido: falta 'data.id'");
      return res.status(400).json({ error: "Payload del webhook inválido: falta 'data.id'" });
    }

    const subscriptionId = data.id;

    if (type !== "subscription_preapproval") {
      console.warn(`Tipo de evento no manejado: ${type}`);
      return res.status(400).json({ error: `Tipo de evento no manejado: ${type}` });
    }

    let subscriptionDetails;
    try {
      subscriptionDetails = await Preapproval.get({ id: subscriptionId });
    } catch (error) {
      console.error("Error obteniendo detalles de la suscripción:", error);
      return res.status(500).json({ error: "Error obteniendo detalles de la suscripción." });
    }

    const { external_reference, status } = subscriptionDetails;

    if (!external_reference) {
      console.error("No se encontró 'external_reference' en los detalles de la suscripción");
      return res.status(400).json({ error: "No se encontró 'external_reference' en los detalles de la suscripción." });
    }

    const subscriptionSnapshot = await db
      .collection("subscriptions")
      .where("userId", "==", external_reference)
      .get();

    if (subscriptionSnapshot.empty) {
      console.error(`No se encontró una suscripción en Firestore con external_reference: ${external_reference}`);
      return res.status(404).json({ error: "No se encontró la suscripción." });
    }

    const subscriptionDoc = subscriptionSnapshot.docs[0];
    const subscriptionRef = subscriptionDoc.ref;

    // Actualizar el estado según el valor de `status`
    if (status === "authorized") {
      await subscriptionRef.update({
        status: "active",
        lastUpdated: new Date().toISOString(),
      });
      console.log(`Suscripción activada exitosamente en Firestore: ${subscriptionRef.id}`);
    } else if (status === "cancelled") {
      await subscriptionRef.update({
        status: "cancelled",
        lastUpdated: new Date().toISOString(),
      });
      console.log(`Suscripción cancelada exitosamente en Firestore: ${subscriptionRef.id}`);
    } else {
      console.warn(`Estado de la suscripción no manejado: ${status}`);
      return res.status(400).json({ error: `Estado de la suscripción no manejado: ${status}` });
    }

    return res.status(200).json({ message: "Suscripción procesada exitosamente." });
  } catch (error) {
    console.error("Error procesando el webhook de suscripción:", error);
    return res.status(500).json({ error: "Error interno del servidor." });
  }
};


module.exports = {
  createSubscription,
  handleSubscriptionWebhook,
};
