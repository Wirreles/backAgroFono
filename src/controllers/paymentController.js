const { db } = require("../firebase");
const { mp } = require('../mercadopago');
const mercadopago = require('mercadopago');

const payment = new mercadopago.Payment(mp);
const PreferenceConfig = new mercadopago.Preference(mp)

// Crear una preferencia de pago
const createPreference = async (req, res) => {
    const { productId, productName, quantity, price, userId } = req.body;
  
    try {
      const result = await PreferenceConfig.create({
        body: {
          items: [
            {
              id: productId,
              title: productName,
              quantity: quantity,
              unit_price: price,
            },
          ],
          // back_urls: {
          //   success: 'https://puntoencuentro1-3.vercel.app/perfil/compras',
          //   failure: 'https://puntoencuentro1-3.vercel.app/perfil/',
          // },
          // auto_return: 'approved',
          notification_url: 'https://backservido.onrender.com/payment_success',
          external_reference: userId,
        },
      });
  
      // Devolver el resultado al cliente
      return res.json(result);
    } catch (error) {
      console.error('Error creando preferencia:', error);
      res.status(500).json({ error: 'Error creando preferencia.' });
    }
  };
  
// Manejar el webhook de pago
const paymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    if (!data || !data.id) {
      console.error("Invalid webhook payload: Missing 'data.id'");
      return res.status(400).json({ error: "Invalid webhook payload: Missing 'data.id'" });
    }

    const paymentId = data.id;

    console.log("Payment ID received from webhook: ", paymentId);
    console.log("Notification type: ", type);

    if (type !== "payment") {
      console.warn(`Unhandled notification type: ${type}`);
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
      console.error("Payment not approved or not found");
      return res.status(400).json({ error: "Payment not approved or not found" });
    }

    const { external_reference, payer } = paymentInfo;

    if (!external_reference) {
      console.error("No external reference found in payment info");
      return res.status(400).json({ error: "No external reference found in payment info" });
    }

    console.log("External reference (winningUserId): ", external_reference);

    const auctionQuery = await db
      .collection("compras")
      .where("userId", "==", external_reference)
      .where("isPaid", "==", false)
      .get();

    if (auctionQuery.empty) {
      console.error(`No pending auction found for winningUserId: ${external_reference}`);
      return res.status(404).json({ error: "No pending auction found" });
    }

    const auctionDoc = auctionQuery.docs[0];
    const auctionData = auctionDoc.data();
    const { serviceId } = auctionData;
    const auctionRef = auctionDoc.ref;

    await auctionRef.update({
      isPaid: true,
      paymentDate: new Date(),
      status: "completed",
      payerEmail: payer?.email || null,
    });

    return res.status(200).json({ message: "Payment processed successfully" });
  } catch (error) {
    console.error("Error handling payment webhook: ", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createPreference,
  paymentWebhook,
};
