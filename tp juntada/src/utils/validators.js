/**
 * Validaciones de datos de entrada usadas por los servicios.
 */
const { BadRequestError } = require("../errors/AppError");

// Texto obligatorio, recortado y con largo máximo
function requireText(value, field, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw new BadRequestError(`Completá ${field}`);
  if (text.length > maxLength) {
    throw new BadRequestError(`${field[0].toUpperCase() + field.slice(1)} puede tener hasta ${maxLength} caracteres`);
  }
  return text;
}

// Id numérico positivo, o null si no es válido
function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Id opcional: null/"" significa "sin valor"
function parseOptionalId(value) {
  return value == null || value === "" ? null : parseId(value);
}

function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

module.exports = { requireText, parseId, parseOptionalId, isValidTime };
