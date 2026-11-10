/**
 * Reglas de acceso a una juntada: que exista y que el usuario sea integrante.
 */
const eventRepository = require("../repositories/eventRepository");
const memberRepository = require("../repositories/memberRepository");
const { NotFoundError, ForbiddenError } = require("../errors/AppError");

async function requireEvent(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw new NotFoundError("Esa juntada no existe o fue eliminada");
  return event;
}

// Devuelve { event, membership } o lanza 404 / 403 (code NOT_MEMBER: el front ofrece sumarse)
async function requireMember(eventId, userId) {
  const event = await requireEvent(eventId);
  const membership = await memberRepository.find(event.id, userId);
  if (!membership) throw new ForbiddenError("No sos integrante de esta juntada", "NOT_MEMBER");
  return { event, membership };
}

module.exports = { requireEvent, requireMember };
