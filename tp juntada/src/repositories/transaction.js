/**
 * Ejecuta varias operaciones de repositorio en una sola transacción.
 * Uso desde un servicio: runInTransaction(async (transaction) => repo.create(data, { transaction }))
 */
const { sequelize } = require("../config/database");

function runInTransaction(work) {
  return sequelize.transaction(work);
}

module.exports = { runInTransaction };
