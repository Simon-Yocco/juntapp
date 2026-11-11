/**
 * Punto de entrada:
 *   1. crea la base si no existe
 *   2. crea las tablas que falten
 *   3. si la base está vacía, carga los datos de prueba (SEED_SAMPLE_DATA en .env)
 *   4. levanta el servidor
 */
const env = require("./src/config/env");
const { sequelize, ensureDatabase, dbConfig } = require("./src/config/database");
require("./src/models");
const userRepository = require("./src/repositories/userRepository");
const { loadSampleData, DEMO_PASSWORD, SAMPLE_USERNAMES } = require("./src/seeders/sampleData");
const { createApp } = require("./src/app");

async function connectDatabase() {
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
}

// Solo si no hay ningún usuario: nunca pisa ni borra datos existentes
async function seedIfEmpty() {
  if (!env.seedSampleData) return;
  if ((await userRepository.count()) > 0) return;

  try {
    const { users, events } = await loadSampleData();
    console.log(`🌱 Base vacía: se cargaron los datos de prueba (${users} usuarios, ${events} juntadas).`);
    console.log(`   Usuarios: ${SAMPLE_USERNAMES.join(", ")} — contraseña: ${DEMO_PASSWORD}`);
  } catch (err) {
    console.error("⚠️  No se pudieron cargar los datos de prueba:", err.message);
    console.error("   La app arranca igual. Podés reiniciar la base con: npm run seed");
  }
}

async function start() {
  await connectDatabase();
  await seedIfEmpty();

  createApp().listen(env.port, () => {
    console.log(`🚀 JUNTAPP corriendo en http://localhost:${env.port}`);
    console.log(`   Base de datos: ${dbConfig.database} en ${dbConfig.host}:${dbConfig.port}`);
  });
}

start();
