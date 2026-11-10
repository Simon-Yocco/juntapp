/**
 * Firma y verificación del token de sesión (JWT).
 */
const jwt = require("jsonwebtoken");
const { session } = require("../config/env");

function signSessionToken(userId) {
  return jwt.sign({ sub: userId }, session.jwtSecret, { expiresIn: `${session.days}d` });
}

// Devuelve el userId del token, o null si es inválido o venció
function verifySessionToken(token) {
  try {
    return jwt.verify(token, session.jwtSecret).sub;
  } catch {
    return null;
  }
}

module.exports = { signSessionToken, verifySessionToken };
