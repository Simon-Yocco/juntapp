/**
 * Errores de la aplicación. Los lanzan los servicios; el middleware errorHandler
 * los traduce a la respuesta HTTP según su `status`.
 */
class AppError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
  }
}

class BadRequestError extends AppError {
  constructor(message) { super(400, message); }
}

class UnauthorizedError extends AppError {
  constructor(message = "Tenés que iniciar sesión") { super(401, message); }
}

class ForbiddenError extends AppError {
  constructor(message, code) { super(403, message, code); }
}

class NotFoundError extends AppError {
  constructor(message) { super(404, message); }
}

class ConflictError extends AppError {
  constructor(message) { super(409, message); }
}

module.exports = { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
