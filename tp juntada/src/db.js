/**
 * Conexión a MySQL con Sequelize.
 * Los datos de conexión salen del archivo .env (ver .env.example).
 */
const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "juntapp"
};

const sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
  host: dbConfig.host,
  port: dbConfig.port,
  dialect: "mysql",
  logging: false,
  define: {
    underscored: true // columnas en snake_case: created_at, organizer_id, etc.
  }
});

// Crea la base de datos si todavía no existe, para no tener que hacerlo a mano en Workbench
async function ensureDatabase() {
  if (!/^[A-Za-z0-9_]+$/.test(dbConfig.database)) {
    throw new Error("DB_NAME solo puede tener letras, números y guiones bajos");
  }
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

module.exports = { sequelize, ensureDatabase, dbConfig };
