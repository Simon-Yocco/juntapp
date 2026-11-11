/**
 * Reinicia la base: BORRA TODAS LAS TABLAS, las vuelve a crear y carga los datos de prueba.
 *     npm run seed
 *
 * No hace falta para empezar: al arrancar la app, los datos de prueba se cargan solos
 * si la base está vacía. Esto sirve para volver al estado inicial.
 */
const { sequelize, ensureDatabase } = require("../config/database");
require("../models");
const { loadSampleData, DEMO_PASSWORD, SAMPLE_USERNAMES } = require("../seeders/sampleData");

async function seed() {
  await ensureDatabase();
  await sequelize.sync({ force: true });
  const { users, events } = await loadSampleData();

  console.log(`✅ Base reiniciada con datos de prueba: ${users} usuarios, ${events} juntadas.`);
  console.log(`   Usuarios: ${SAMPLE_USERNAMES.join(", ")} — contraseña: ${DEMO_PASSWORD}`);
}

seed()
  .catch(err => {
    console.error("❌ Error cargando los datos de prueba:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
