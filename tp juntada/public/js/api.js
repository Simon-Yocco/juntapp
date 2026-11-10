/**
 * Cliente de la API de JUNTAPP. La sesión viaja en una cookie httpOnly que maneja el navegador.
 */
class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function apiRequest(method, path, body) {
  let response;
  try {
    response = await fetch("/api" + path, {
      method,
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // respuesta sin cuerpo JSON
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.error || "Ocurrió un error inesperado", data?.code);
  }
  return data;
}

const api = {
  get: (path) => apiRequest("GET", path),
  post: (path, body = {}) => apiRequest("POST", path, body),
  put: (path, body = {}) => apiRequest("PUT", path, body),
  del: (path) => apiRequest("DELETE", path)
};
