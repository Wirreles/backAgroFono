
const mercadopago = require('mercadopago');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configuración explícita para la versión 5.x o superior
const mp = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const mpSub = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN_SUBSCRIPTION,
});


if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error('El token de acceso de MercadoPago no está definido.');
}

module.exports = {
  mp,
  mpSub
};
