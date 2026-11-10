/**
 * Registro, inicio y cierre de sesión.
 */
const express = require("express");
const bcrypt = require("bcryptjs");
const { User } = require("../models");
const { HttpError, badRequest } = require("../errors");
const { requireAuth, setSessionCookie, clearSessionCookie, publicUser } = require("../auth");

const router = express.Router();
const BCRYPT_ROUNDS = 10;

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

router.post("/register", async (req, res) => {
  const username = cleanString(req.body?.username).toLowerCase();
  const displayName = cleanString(req.body?.displayName);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
    throw badRequest("El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo");
  }
  if (displayName.length < 1 || displayName.length > 40) {
    throw badRequest("Ingresá tu nombre (hasta 40 caracteres)");
  }
  if (password.length < 6 || password.length > 72) {
    throw badRequest("La contraseña debe tener entre 6 y 72 caracteres");
  }

  const existing = await User.findOne({ where: { username } });
  if (existing) throw new HttpError(409, "Ese usuario ya existe, elegí otro");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ username, displayName, passwordHash });

  setSessionCookie(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const username = cleanString(req.body?.username).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const user = username ? await User.findOne({ where: { username } }) : null;
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!valid) throw new HttpError(401, "Usuario o contraseña incorrectos");

  setSessionCookie(res, user);
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
