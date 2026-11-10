/**
 * Exige sesión iniciada. Deja el usuario en req.user = { id, username, displayName }.
 */
const authService = require("../services/authService");
const { verifySessionToken } = require("../utils/sessionToken");
const { SESSION_COOKIE, clearSessionCookie } = require("../utils/sessionCookie");
const { UnauthorizedError } = require("../errors/AppError");

async function requireAuth(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new UnauthorizedError();

  const userId = verifySessionToken(token);
  const user = userId ? await authService.getUserById(userId) : null;
  if (!user) {
    clearSessionCookie(res);
    throw new UnauthorizedError("Tu sesión venció, iniciá sesión de nuevo");
  }

  req.user = user;
  next();
}

module.exports = requireAuth;
