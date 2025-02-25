const express = require("express");
const path = require("path");
const morgan = require("morgan");
const cors = require("cors"); // Importar el paquete CORS
const paymentRouter = require('../src/routes/paymetRoutes');
const subscriptionRouter = require('../src/routes/subscriptionRoutes');
const app = express();

// Settings
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "views"));

// middlewares
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Habilitar CORS
app.use(cors());
app.use(cors({
    origin: "*", // Reemplaza con el dominio permitido
    methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
    credentials: true, // Habilita las cookies si es necesario
  }));
  
// Routes
app.use('/payments', paymentRouter);
app.use('/subscription', subscriptionRouter);

module.exports = app;
