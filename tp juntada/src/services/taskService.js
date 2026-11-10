/**
 * Reglas de tareas: anotar una nueva con responsable, anotarse y quitarse.
 */
const taskRepository = require("../repositories/taskRepository");
const memberRepository = require("../repositories/memberRepository");
const { runInTransaction } = require("../repositories/transaction");
const { requireMember } = require("./accessService");
const { buildView } = require("./eventService");
const { requireText, parseId, parseOptionalId } = require("../utils/validators");
const { BadRequestError, NotFoundError } = require("../errors/AppError");

async function create(eventId, userId, { title, assigneeId }) {
  const { event } = await requireMember(eventId, userId);
  const cleanTitle = requireText(title, "la tarea", 80);
  const responsibleId = parseOptionalId(assigneeId);

  // El responsable puede ser cualquier integrante (o nadie)
  if (responsibleId !== null) {
    const memberIds = await memberRepository.listUserIds(event.id);
    if (!memberIds.includes(responsibleId)) {
      throw new BadRequestError("El responsable tiene que ser integrante de la juntada");
    }
  }

  await runInTransaction(async (transaction) => {
    const task = await taskRepository.create({ eventId: event.id, title: cleanTitle, maxAssignees: 1 }, { transaction });
    if (responsibleId !== null) await taskRepository.addAssignee(task.id, responsibleId, { transaction });
  });
  return buildView(event.id, userId);
}

async function requireTask(taskId, eventId) {
  const task = await taskRepository.findInEvent(parseId(taskId), eventId);
  if (!task) throw new NotFoundError("Esa tarea no existe");
  return task;
}

// Anotarme en una tarea, respetando el cupo máximo de responsables
async function claim(eventId, userId, taskId) {
  const { event } = await requireMember(eventId, userId);
  const task = await requireTask(taskId, event.id);

  const alreadyIn = task.assignees.some(a => a.userId === userId);
  if (!alreadyIn) {
    if (task.assignees.length >= task.maxAssignees) throw new BadRequestError("Esa tarea ya tiene el cupo completo");
    await taskRepository.addAssignee(task.id, userId);
  }
  return buildView(event.id, userId);
}

async function unclaim(eventId, userId, taskId) {
  const { event } = await requireMember(eventId, userId);
  const task = await requireTask(taskId, event.id);
  await taskRepository.removeAssignee(task.id, userId);
  return buildView(event.id, userId);
}

module.exports = { create, claim, unclaim };
