/**
 * Conexión a MySQL con Sequelize.
 */
const mysql = require("mysql2/promise");
const { Sequelize } = require("sequelize");
const env = require("./env");

const dbConfig = env.db;

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
