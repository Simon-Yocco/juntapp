/**
 * Controlador de cuentas: traduce HTTP ↔ authService y maneja la cookie de sesión.
 */
const authService = require("../services/authService");
const { setSessionCookie, clearSessionCookie } = require("../utils/sessionCookie");

async function register(req, res) {
  const user = await authService.register(req.body ?? {});
  setSessionCookie(res, user.id);
  res.status(201).json({ user });
}

async function login(req, res) {
  const user = await authService.login(req.body ?? {});
  setSessionCookie(res, user.id);
  res.json({ user });
}

function logout(req, res) {
  clearSessionCookie(res);
  res.json({ ok: true });
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { register, login, logout, me };
