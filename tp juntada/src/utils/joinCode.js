/**
 * Códigos para unirse a una juntada: 6 caracteres, mayúsculas y números.
 * Se excluyen los que se confunden al dictarlos o escribirlos: I, O, 0 y 1.
 */
const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;
const PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

function generateJoinCode() {
  let code = "";
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return code;
}

// Acepta "k7mq2x", "K7M-Q2X" o " K7MQ2X " y devuelve "K7MQ2X"
function normalizeJoinCode(value) {
  return typeof value === "string" ? value.toUpperCase().replace(/[\s-]/g, "") : "";
}

function isValidJoinCode(code) {
  return PATTERN.test(code);
}

module.exports = { generateJoinCode, normalizeJoinCode, isValidJoinCode, JOIN_CODE_LENGTH: LENGTH };
