/**
 * Servidor de JUNTAPP: API en /api y el front (carpeta public/) en el mismo puerto.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

const express = require("express");
const cookieParser = require("cookie-parser");
const { sequelize, ensureDatabase, dbConfig } = require("./src/db");
require("./src/models");
const { requireAuth } = require("./src/auth");
const authRoutes = require("./src/routes/auth");
const eventRoutes = require("./src/routes/events");
const { errorHandler } = require("./src/errors");

const PORT = Number(process.env.PORT) || 3000;
const app = express();

app.use(express.json({ limit: "50kb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/events", requireAuth, eventRoutes);
app.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Solo se sirve public/: así nunca quedan expuestos .env ni el código del servidor
app.use(express.static(path.join(__dirname, "public")));

app.use(errorHandler);

async function start() {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    await sequelize.sync(); // crea las tablas que falten (no modifica las existentes)
  } catch (err) {
    console.error("\n❌ No se pudo conectar a MySQL.");
    console.error(`   Revisá que MySQL esté corriendo en ${dbConfig.host}:${dbConfig.port} y los datos del archivo .env`);
    const detail = err.message || err.code || err.errors?.[0]?.message || String(err);
    console.error(`   Detalle: ${detail}\n`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 JUNTAPP corriendo en http://localhost:${PORT}`);
    console.log(`   Base de datos: ${dbConfig.database} en ${dbConfig.host}:${dbConfig.port}`);
  });
}

start();
