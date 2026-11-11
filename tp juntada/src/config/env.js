/**
 * Configuración leída del archivo .env (ver .env.example).
 */
const path = require("path");
const crypto = require("crypto");

require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env"), quiet: true });

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  jwtSecret = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️  Falta JWT_SECRET en .env: se usa una clave temporal y las sesiones se pierden al reiniciar.");
}

const isProduction = process.env.NODE_ENV === "production";

module.exports = {
  port: Number(process.env.PORT) || 3000,
  isProduction,
  // Cargar los datos de prueba al arrancar si la base está vacía (nunca en producción)
  seedSampleData: !isProduction && process.env.SEED_SAMPLE_DATA !== "false",
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "juntapp"
  },
  session: {
    jwtSecret,
    days: 7
  }
};
