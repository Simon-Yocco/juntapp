/**
 * Manejador central de errores: traduce cualquier error a una respuesta JSON { error, code }.
 */
const { ValidationError: SequelizeValidationError, UniqueConstraintError } = require("sequelize");
const { AppError } = require("../errors/AppError");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ error: "Ese dato ya existe" });
  }
  if (err instanceof SequelizeValidationError) {
    return res.status(400).json({ error: "Hay datos inválidos: revisá lo que cargaste" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Formato de datos inválido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

// Rutas de /api que no existen
function apiNotFound(req, res) {
  res.status(404).json({ error: "Ruta no encontrada" });
}

module.exports = { errorHandler, apiNotFound };
