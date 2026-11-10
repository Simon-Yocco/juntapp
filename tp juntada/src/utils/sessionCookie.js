/**
 * Cookie de sesión httpOnly (el JavaScript del navegador no la puede leer).
 */
const { session, isProduction } = require("../config/env");
const { signSessionToken } = require("./sessionToken");

const SESSION_COOKIE = "juntapp_session";

function setSessionCookie(res, userId) {
  res.cookie(SESSION_COOKIE, signSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: session.days * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE);
}

module.exports = { SESSION_COOKIE, setSessionCookie, clearSessionCookie };
