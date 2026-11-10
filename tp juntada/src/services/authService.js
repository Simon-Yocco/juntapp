/**
 * Reglas de cuentas de usuario: registro, inicio de sesión.
 */
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
const { presentUser } = require("../views/eventPresenter");
const { BadRequestError, UnauthorizedError, ConflictError } = require("../errors/AppError");

const BCRYPT_ROUNDS = 10;
const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

function normalizeUsername(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function register({ username, displayName, password }) {
  const cleanUsername = normalizeUsername(username);
  const cleanDisplayName = typeof displayName === "string" ? displayName.trim() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw new BadRequestError("El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo");
  }
  if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40) {
    throw new BadRequestError("Ingresá tu nombre (hasta 40 caracteres)");
  }
  if (cleanPassword.length < 6 || cleanPassword.length > 72) {
    throw new BadRequestError("La contraseña debe tener entre 6 y 72 caracteres");
  }

  if (await userRepository.findByUsername(cleanUsername)) {
    throw new ConflictError("Ese usuario ya existe, elegí otro");
  }

  const passwordHash = await hashPassword(cleanPassword);
  const user = await userRepository.create({ username: cleanUsername, displayName: cleanDisplayName, passwordHash });
  return presentUser(user);
}

async function login({ username, password }) {
  const cleanUsername = normalizeUsername(username);
  const user = cleanUsername ? await userRepository.findByUsername(cleanUsername) : null;
  const valid = user && typeof password === "string"
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
  if (!valid) throw new UnauthorizedError("Usuario o contraseña incorrectos");
  return presentUser(user);
}

async function getUserById(id) {
  const user = await userRepository.findById(id);
  return user ? presentUser(user) : null;
}

function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

module.exports = { register, login, getUserById, hashPassword };
