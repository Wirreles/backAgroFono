const { db } = require("../firebase");
const { mp } = require('../mercadopago');
const { getPayPalClient } = require('../paypal');
const mercadopago = require('mercadopago');
const paypal = require('@paypal/checkout-server-sdk'); // <-- Agrega esta línea

const payment = new mercadopago.Payment(mp);
const PreferenceConfig = new mercadopago.Preference(mp)

// Función para generar un ID único de consulta
function createIdDoc() {
  return db.collection('dummyCollection').doc().id; // Genera un ID único sin crear un documento real
}

// Crear una preferencia de pago para una consulta con ID generado
const createPreference = async (req, res) => {
  const { price, dni } = req.body;

  if (!price || !dni) {
    return res.status(400).json({ error: 'Faltan datos en la solicitud.' });
  }

  try {
    // Generar un ID único para la consulta
    const consultaId = createIdDoc();

    // Crear el documento en Firestore con estado "pending"
    const consultaRef = db.collection('consultas').doc(consultaId);
    await consultaRef.set({
      id: consultaId,
      price,
      dni,
      status: 'pending',
      createdAt: new Date(),
    });

    // Crear la preferencia de pago en MercadoPago
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          {
            id: consultaId,
            title: 'Consulta Agrofono',
            quantity: 1,
            unit_price: price,
          },
        ],
        back_urls: {
          success: 'http://localhost:4200/home',
          failure: 'http://localhost:4200/home',
        },
        auto_return: 'approved',
        notification_url: 'http://localhost:3000/webhook',
        external_reference: consultaId, // Usamos el ID de la consulta como referencia externa
      },
    });

    return res.json({ preference: result, consultaId });
  } catch (error) {
    console.error('Error creando preferencia:', error);
    return res.status(500).json({ error: 'Error creando preferencia.' });
  }
};

// Webhook para manejar el pago de la consulta
const paymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!data || !data.id) {
      return res.status(400).json({ error: "Invalid webhook payload: Missing 'data.id'" });
    }

    const paymentId = data.id;
    console.log("Payment ID received from webhook: ", paymentId);
    console.log("Notification type: ", type);

    if (type !== "payment") {
      return res.status(400).json({ error: `Unhandled notification type: ${type}` });
    }

    let paymentInfo;
    try {
      paymentInfo = await payment.get({ id: paymentId });
      console.log("Payment Info: ", JSON.stringify(paymentInfo, null, 2));
    } catch (error) {
      console.error("Error fetching payment info: ", error);
      return res.status(500).json({ error: "Error fetching payment info" });
    }

    if (!paymentInfo || paymentInfo.status !== "approved") {
      return res.status(400).json({ error: "Payment not approved or not found" });
    }

    const { external_reference, payer } = paymentInfo;
    if (!external_reference) {
      return res.status(400).json({ error: "No external reference found in payment info" });
    }

    console.log("External reference (consultaId): ", external_reference);

    const consultaRef = db.collection("consultas").doc(external_reference);
    const consultaDoc = await consultaRef.get();

    if (!consultaDoc.exists) {
      return res.status(404).json({ error: "No pending consulta found" });
    }

    // Actualizar la consulta con el estado "completed"
    await consultaRef.update({
      status: "completed",
      paymentDate: new Date(),
      payerEmail: payer?.email || null,
    });

    return res.status(200).json({ message: "Payment processed successfully" });
  } catch (error) {
    console.error("Error handling payment webhook: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// Crear una orden de pago en PayPal
const createOrder = async (req, res) => {
  try {
    const { amount, dni } = req.body;

    if (!amount || !dni) {
      return res.status(400).json({ error: 'Faltan datos en la solicitud.' });
    }

    // Generar un ID único para la consulta
    const consultaId = createIdDoc();

    // Guardar la consulta en Firestore con estado "pending"
    const consultaRef = db.collection('consultas').doc(consultaId);
    await consultaRef.set({
      id: consultaId,
      price: amount,
      dni,
      status: 'pending',
      createdAt: new Date(),
    });

    // Crear la orden en PayPal
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: consultaId, // Guardamos el ID de la consulta en PayPal
          amount: {
            currency_code: 'USD',
            value: amount,
          },
        },
      ],
    });

    const client = getPayPalClient();
    const response = await client.execute(request);

    return res.json({ id: response.result.id, consultaId });
  } catch (error) {
    console.error('Error creando orden de PayPal:', error);
    return res.status(500).json({ error: 'Error creando orden de PayPal.' });
  }
};

// Capturar el pago después de la aprobación del usuario
const captureOrder = async (req, res) => {
  try {
    const { orderID } = req.body;

    if (!orderID) {
      return res.status(400).json({ error: 'Falta el orderID.' });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderID);
    request.requestBody({});

    const client = getPayPalClient();
    const response = await client.execute(request);

    // Verificar que el pago fue exitoso
    if (response.result.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'El pago no fue completado.' });
    }

    // Obtener el ID de la consulta desde PayPal
    const consultaId = response.result.purchase_units[0].reference_id;
    if (!consultaId) {
      return res.status(400).json({ error: 'No se encontró el reference_id en la orden.' });
    }

    console.log('Consulta pagada:', consultaId);

    // Buscar la consulta en Firestore y actualizar su estado
    const consultaRef = db.collection('consultas').doc(consultaId);
    const consultaDoc = await consultaRef.get();

    if (!consultaDoc.exists) {
      return res.status(404).json({ error: 'No se encontró la consulta en la base de datos.' });
    }

    await consultaRef.update({
      status: 'completed',
      paymentDate: new Date(),
      payerEmail: response.result.payer.email_address || null,
    });

    return res.json({ message: 'Pago de PayPal procesado con éxito' });
  } catch (error) {
    console.error('Error capturando pago de PayPal:', error);
    return res.status(500).json({ error: 'Error capturando pago de PayPal.' });
  }
};

module.exports = {
  createPreference,
  paymentWebhook,
  createOrder, 
  captureOrder
};
