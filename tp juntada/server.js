/**
 * Punto de entrada: conecta a MySQL, crea las tablas que falten y levanta el servidor.
 */
const env = require("./src/config/env");
const { sequelize, ensureDatabase, dbConfig } = require("./src/config/database");
require("./src/models");
const { createApp } = require("./src/app");

async function start() {
  try {
    await ensureDatabase();
    await sequelize.authenticate();
    await sequelize.sync(); // crea las tablas que falten (no modifica las existentes)
  } catch (err) {
    const detail = err.message || err.code || err.errors?.[0]?.message || String(err);
    console.error("\n❌ No se pudo conectar a MySQL.");
    console.error(`   Revisá que MySQL esté corriendo en ${dbConfig.host}:${dbConfig.port} y los datos del archivo .env`);
    console.error(`   Detalle: ${detail}\n`);
    process.exit(1);
  }

  createApp().listen(env.port, () => {
    console.log(`🚀 JUNTAPP corriendo en http://localhost:${env.port}`);
    console.log(`   Base de datos: ${dbConfig.database} en ${dbConfig.host}:${dbConfig.port}`);
  });
}

start();
