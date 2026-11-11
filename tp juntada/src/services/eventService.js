/**
 * Reglas de juntadas: crear, listar, ver, sumarse, eliminar y responder asistencia.
 */
const eventRepository = require("../repositories/eventRepository");
const memberRepository = require("../repositories/memberRepository");
const dateRepository = require("../repositories/dateRepository");
const taskRepository = require("../repositories/taskRepository");
const { runInTransaction } = require("../repositories/transaction");
const { presentEvent, presentEventSummary } = require("../views/eventPresenter");
const { requireEvent, requireMember } = require("./accessService");
const { requireText } = require("../utils/validators");
const { generateJoinCode, normalizeJoinCode, isValidJoinCode } = require("../utils/joinCode");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../errors/AppError");

const MAX_CODE_ATTEMPTS = 10;

// Plazos para confirmar, en horas: de unas horas hasta una semana
const DEADLINE_HOURS = [6, 12, 24, 48, 72, 168];
const RSVP_STATUSES = ["yes", "maybe", "no"];
const MAX_DATE_LABEL = 40;

// Toda juntada arranca con estas tareas; la limpieza es el compromiso de orden mutuo
const DEFAULT_TASKS = [
  { title: "Limpieza final", maxAssignees: 2, isPact: true },
  { title: "Hielo y vasos", maxAssignees: 1 },
  { title: "Bebidas", maxAssignees: 2 },
  { title: "Snacks", maxAssignees: 2 }
];

// Arma la juntada completa como la ve un usuario (sin chequear permisos)
async function buildView(eventId, currentUserId) {
  const event = await eventRepository.findWithDetails(eventId);
  if (!event) return null;
  const memberIds = event.members.map(m => m.userId);
  const hostCounts = await eventRepository.countHostingsByUsers(memberIds, { excludeEventId: event.id });
  return presentEvent(event, hostCounts, currentUserId);
}

async function listForUser(userId) {
  const eventIds = await eventRepository.findIdsByMember(userId);
  const views = await Promise.all(eventIds.map(id => buildView(id, userId)));
  return views.filter(Boolean).map(presentEventSummary);
}

async function getForMember(eventId, userId) {
  await requireMember(eventId, userId);
  return buildView(eventId, userId);
}

/**
 * Crea la juntada con su organizador como integrante confirmado y anfitrión inicial.
 * Sin validaciones de entrada: la usan create() y los datos de ejemplo.
 */
async function createEventRecord({ organizerId, title, dateLabels, deadline, tasks = DEFAULT_TASKS }) {
  return runInTransaction(async (transaction) => {
    const event = await eventRepository.create({
      title,
      joinCode: await generateUniqueJoinCode({ transaction }),
      deadline,
      organizerId,
      hostMode: "house",
      currentHostId: organizerId
    }, { transaction });

    await memberRepository.create({ eventId: event.id, userId: organizerId, status: "yes" }, { transaction });
    for (const label of dateLabels) {
      await dateRepository.create({ eventId: event.id, label }, { transaction });
    }
    for (const task of tasks) {
      await taskRepository.create({ ...task, eventId: event.id }, { transaction });
    }
    return event;
  });
}

async function create(userId, { title, dates, hours }) {
  const cleanTitle = requireText(title, "el título", 80);

  const deadlineHours = Number(hours);
  if (!DEADLINE_HOURS.includes(deadlineHours)) throw new BadRequestError("Elegí un plazo válido para confirmar");

  // Fechas sin vacías ni repetidas
  const dateLabels = [];
  (Array.isArray(dates) ? dates : []).forEach(d => {
    const label = typeof d === "string" ? d.trim() : "";
    if (label && label.length <= MAX_DATE_LABEL && !dateLabels.some(l => l.toLowerCase() === label.toLowerCase())) {
      dateLabels.push(label);
    }
  });
  if (dateLabels.length === 0) throw new BadRequestError("Proponé al menos una fecha");

  const event = await createEventRecord({
    organizerId: userId,
    title: cleanTitle,
    dateLabels,
    deadline: new Date(Date.now() + deadlineHours * 3600 * 1000)
  });
  return buildView(event.id, userId);
}

// Genera un código que no use ninguna otra juntada
async function generateUniqueJoinCode(options = {}) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateJoinCode();
    if (!(await eventRepository.joinCodeExists(code, options))) return code;
  }
  throw new Error("No se pudo generar un código único para la juntada");
}

// Sumarse desde el link de invitación (si ya era integrante, no cambia nada)
async function join(eventId, userId) {
  const event = await requireEvent(eventId);
  await memberRepository.findOrCreate(event.id, userId);
  return buildView(event.id, userId);
}

// Sumarse escribiendo el código de la juntada (si ya era integrante, no cambia nada)
async function joinByCode(userId, rawCode) {
  const code = normalizeJoinCode(rawCode);
  if (!isValidJoinCode(code)) throw new BadRequestError("El código tiene 6 caracteres, por ejemplo K7MQ2X");

  const event = await eventRepository.findByJoinCode(code);
  if (!event) throw new NotFoundError("No hay ninguna juntada con ese código. Revisalo y probá de nuevo");

  const [, created] = await memberRepository.findOrCreate(event.id, userId);
  const view = await buildView(event.id, userId);
  return { ...view, justJoined: created };
}

async function remove(eventId, userId) {
  const { event } = await requireMember(eventId, userId);
  if (event.organizerId !== userId) throw new ForbiddenError("Solo quien organizó la juntada puede eliminarla");
  await eventRepository.destroy(event);
}

async function setRsvp(eventId, userId, status) {
  const { membership } = await requireMember(eventId, userId);
  if (!RSVP_STATUSES.includes(status)) throw new BadRequestError("Respuesta de asistencia inválida");
  await memberRepository.setStatus(membership, status);
  return buildView(eventId, userId);
}

module.exports = {
  DEADLINE_HOURS,
  DEFAULT_TASKS,
  buildView,
  listForUser,
  getForMember,
  createEventRecord,
  create,
  join,
  joinByCode,
  remove,
  setRsvp
};
