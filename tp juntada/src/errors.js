/**
 * Errores con código HTTP y manejador central de errores de Express.
 */
const { ValidationError, UniqueConstraintError } = require("sequelize");

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (message) => new HttpError(400, message);
const forbidden = (message, code) => new HttpError(403, message, code);
const notFound = (message) => new HttpError(404, message);

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({ error: "Ese dato ya existe" });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: "Hay datos inválidos: revisá lo que cargaste" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Formato de datos inválido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}

module.exports = { HttpError, badRequest, forbidden, notFound, errorHandler };
