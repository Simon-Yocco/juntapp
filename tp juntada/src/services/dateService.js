/**
 * Reglas de fechas: proponer una opción nueva y votar.
 */
const dateRepository = require("../repositories/dateRepository");
const { runInTransaction } = require("../repositories/transaction");
const { requireMember } = require("./accessService");
const { buildView } = require("./eventService");
const { parseId, isValidTime } = require("../utils/validators");
const { BadRequestError, NotFoundError } = require("../errors/AppError");

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/**
 * Agrega una opción de fecha y la vota quien la propone.
 * Si ya existe una igual, no la duplica: solo suma el voto.
 */
async function addProposal({ eventId, userId, label }) {
  return runInTransaction(async (transaction) => {
    const existing = await dateRepository.listByEvent(eventId, { transaction });
    let option = existing.find(d => d.label.toLowerCase() === label.toLowerCase());
    if (!option) {
      option = await dateRepository.create({ eventId, label, proposedById: userId }, { transaction });
    }
    await dateRepository.addVote(option.id, userId, { transaction });
    return option;
  });
}

async function propose(eventId, userId, { day, time }) {
  const { event } = await requireMember(eventId, userId);
  if (!DAYS.includes(day)) throw new BadRequestError("Elegí un día");
  if (!isValidTime(time)) throw new BadRequestError("Elegí un horario");

  await addProposal({ eventId: event.id, userId, label: `${day} ${time} hs` });
  return buildView(event.id, userId);
}

// Votar o quitar el voto (toggle)
async function toggleVote(eventId, userId, dateOptionId) {
  const { event } = await requireMember(eventId, userId);
  const option = await dateRepository.findInEvent(parseId(dateOptionId), event.id);
  if (!option) throw new NotFoundError("Esa fecha no existe");

  const removed = await dateRepository.removeVote(option.id, userId);
  if (!removed) await dateRepository.addVote(option.id, userId);
  return buildView(event.id, userId);
}

module.exports = { DAYS, propose, toggleVote };
