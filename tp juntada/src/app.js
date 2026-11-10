/**
 * Arma la aplicación Express: API en /api y el front (carpeta public/).
 * Separado de server.js para poder crear la app sin levantar el servidor.
 */
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const apiRoutes = require("./routes");
const { errorHandler } = require("./middlewares/errorHandler");

function createApp() {
  const app = express();

  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  app.use("/api", apiRoutes);

  // Solo se sirve public/: así nunca quedan expuestos .env ni el código del servidor
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
