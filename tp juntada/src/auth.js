/**
 * Sesiones con JWT guardado en una cookie httpOnly (el JavaScript del navegador no la puede leer).
 */
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { User } = require("./models");
const { HttpError } = require("./errors");

const COOKIE_NAME = "juntapp_session";
const SESSION_DAYS = 7;

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  jwtSecret = crypto.randomBytes(32).toString("hex");
  console.warn("⚠️  Falta JWT_SECRET en .env: se usa una clave temporal y las sesiones se pierden al reiniciar.");
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

// Exige sesión iniciada; deja el usuario en req.user
async function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next(new HttpError(401, "Tenés que iniciar sesión"));

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    clearSessionCookie(res);
    return next(new HttpError(401, "Tu sesión venció, iniciá sesión de nuevo"));
  }

  const user = await User.findByPk(payload.sub);
  if (!user) {
    clearSessionCookie(res);
    return next(new HttpError(401, "Tenés que iniciar sesión"));
  }

  req.user = publicUser(user);
  next();
}

module.exports = { requireAuth, setSessionCookie, clearSessionCookie, publicUser };
