/**
 * Reglas de gastos: cargar un gasto dividido entre integrantes y borrarlo.
 * La liquidación (quién le transfiere a quién) se calcula en el front con los gastos de la juntada.
 */
const expenseRepository = require("../repositories/expenseRepository");
const memberRepository = require("../repositories/memberRepository");
const taskRepository = require("../repositories/taskRepository");
const { runInTransaction } = require("../repositories/transaction");
const { requireMember } = require("./accessService");
const { buildView } = require("./eventService");
const { requireText, parseId, parseOptionalId } = require("../utils/validators");
const { BadRequestError, ForbiddenError, NotFoundError } = require("../errors/AppError");

const MAX_AMOUNT = 9999999999;

async function add(eventId, userId, { description, amount, payerId, participantIds, taskId }) {
  const { event } = await requireMember(eventId, userId);
  const cleanDescription = requireText(description, "el concepto del gasto", 80);

  // Regla de negocio: el monto siempre es mayor a 0
  const cleanAmount = Number(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) throw new BadRequestError("Ingresá un monto mayor a 0");
  if (cleanAmount > MAX_AMOUNT) throw new BadRequestError("El monto es demasiado grande");

  const memberIds = await memberRepository.listUserIds(event.id);

  const cleanPayerId = parseId(payerId);
  if (!memberIds.includes(cleanPayerId)) throw new BadRequestError("Quien pagó tiene que ser integrante de la juntada");

  const cleanParticipantIds = Array.isArray(participantIds) ? [...new Set(participantIds.map(parseId))] : [];
  if (cleanParticipantIds.length === 0) throw new BadRequestError("Elegí al menos un integrante para dividir el gasto");
  if (cleanParticipantIds.some(id => !memberIds.includes(id))) {
    throw new BadRequestError("Solo se puede dividir entre integrantes de la juntada");
  }

  // Tarea relacionada (opcional)
  let relatedTaskId = null;
  if (parseOptionalId(taskId) !== null) {
    const task = await taskRepository.findInEvent(parseId(taskId), event.id);
    if (!task) throw new BadRequestError("Esa tarea no existe");
    relatedTaskId = task.id;
  }

  await runInTransaction((transaction) => expenseRepository.createWithParticipants({
    eventId: event.id,
    description: cleanDescription,
    amount: Math.round(cleanAmount * 100) / 100,
    payerId: cleanPayerId,
    createdById: userId,
    taskId: relatedTaskId
  }, cleanParticipantIds, { transaction }));

  return buildView(event.id, userId);
}

// Pueden borrarlo quien lo cargó, quien pagó o quien organizó la juntada
async function remove(eventId, userId, expenseId) {
  const { event } = await requireMember(eventId, userId);
  const expense = await expenseRepository.findInEvent(parseId(expenseId), event.id);
  if (!expense) throw new NotFoundError("Ese gasto no existe");

  const canDelete = [expense.createdById, expense.payerId, event.organizerId].includes(userId);
  if (!canDelete) throw new ForbiddenError("Solo quien cargó el gasto, quien pagó o quien organizó pueden borrarlo");

  await expenseRepository.destroy(expense);
  return buildView(event.id, userId);
}

module.exports = { add, remove };
