/**
 * API de juntadas. Todas las rutas requieren sesión (ver server.js).
 * Las que modifican algo devuelven la juntada actualizada, así el front re-renderiza con un solo pedido.
 */
const express = require("express");
const {
  sequelize, Event, EventMember, DateOption, DateVote, Task, TaskAssignee, Expense, ExpenseParticipant
} = require("../models");
const { badRequest, forbidden, notFound } = require("../errors");
const { buildEventView, summarizeEventView } = require("../eventView");
const { DEADLINE_HOURS, createEvent, proposeDate, pickNextHost } = require("../eventService");

const router = express.Router();

const RSVP_STATUSES = ["yes", "maybe", "no"];
const NEUTRAL_SPOTS = ["Bar / Birrería", "Plaza / Parque"];
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ----------------- HELPERS -----------------

function cleanText(value, field, maxLength) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw badRequest(`Completá ${field}`);
  if (text.length > maxLength) throw badRequest(`${field[0].toUpperCase() + field.slice(1)} puede tener hasta ${maxLength} caracteres`);
  return text;
}

function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function sendView(req, res, status = 200) {
  const view = await buildEventView(req.params.id, req.user.id);
  res.status(status).json(view);
}

// Carga la juntada y exige que el usuario sea integrante
async function requireMember(req, res, next) {
  const event = await Event.findByPk(req.params.id);
  if (!event) throw notFound("Esa juntada no existe o fue eliminada");

  const membership = await EventMember.findOne({ where: { eventId: event.id, userId: req.user.id } });
  if (!membership) throw forbidden("No sos integrante de esta juntada", "NOT_MEMBER");

  req.event = event;
  req.membership = membership;
  next();
}

async function memberIdsOf(eventId) {
  const members = await EventMember.findAll({ where: { eventId }, attributes: ["userId"] });
  return members.map(m => m.userId);
}

// ----------------- JUNTADAS -----------------

// Juntadas de las que soy integrante
router.get("/", async (req, res) => {
  const memberships = await EventMember.findAll({
    where: { userId: req.user.id },
    include: [{ model: Event, attributes: ["id", "createdAt"] }],
    order: [[Event, "createdAt", "DESC"]]
  });
  const views = await Promise.all(memberships.map(m => buildEventView(m.eventId, req.user.id)));
  res.json(views.filter(Boolean).map(summarizeEventView));
});

router.post("/", async (req, res) => {
  const title = cleanText(req.body?.title, "el título", 80);
  const hours = Number(req.body?.hours);
  if (!DEADLINE_HOURS.includes(hours)) throw badRequest("Elegí un plazo válido para confirmar");

  const rawDates = Array.isArray(req.body?.dates) ? req.body.dates : [];
  const dateLabels = [];
  rawDates.forEach(d => {
    const label = typeof d === "string" ? d.trim() : "";
    if (label && label.length <= 40 && !dateLabels.some(l => l.toLowerCase() === label.toLowerCase())) {
      dateLabels.push(label);
    }
  });
  if (dateLabels.length === 0) throw badRequest("Proponé al menos una fecha");

  const event = await createEvent({
    organizerId: req.user.id,
    title,
    dateLabels,
    deadline: new Date(Date.now() + hours * 3600 * 1000)
  });
  res.status(201).json(await buildEventView(event.id, req.user.id));
});

router.get("/:id", requireMember, (req, res) => sendView(req, res));

// Sumarse a una juntada desde el link de invitación
router.post("/:id/join", async (req, res) => {
  const event = await Event.findByPk(req.params.id);
  if (!event) throw notFound("Esa juntada no existe o fue eliminada");
  await EventMember.findOrCreate({ where: { eventId: event.id, userId: req.user.id } });
  await sendView(req, res);
});

router.delete("/:id", requireMember, async (req, res) => {
  if (req.event.organizerId !== req.user.id) throw forbidden("Solo quien organizó la juntada puede eliminarla");
  await req.event.destroy();
  res.json({ ok: true });
});

// ----------------- ASISTENCIA -----------------

router.put("/:id/rsvp", requireMember, async (req, res) => {
  const status = req.body?.status;
  if (!RSVP_STATUSES.includes(status)) throw badRequest("Respuesta de asistencia inválida");
  req.membership.status = status;
  await req.membership.save();
  await sendView(req, res);
});

// ----------------- FECHAS -----------------

router.post("/:id/dates", requireMember, async (req, res) => {
  const day = req.body?.day;
  const time = req.body?.time;
  if (!DAYS.includes(day)) throw badRequest("Elegí un día");
  if (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw badRequest("Elegí un horario");

  await proposeDate({ eventId: req.event.id, userId: req.user.id, label: `${day} ${time} hs` });
  await sendView(req, res, 201);
});

// Votar / quitar el voto (toggle)
router.post("/:id/dates/:dateId/vote", requireMember, async (req, res) => {
  const option = await DateOption.findOne({ where: { id: toId(req.params.dateId), eventId: req.event.id } });
  if (!option) throw notFound("Esa fecha no existe");

  const where = { dateOptionId: option.id, userId: req.user.id };
  const deleted = await DateVote.destroy({ where });
  if (!deleted) await DateVote.create(where);
  await sendView(req, res);
});

// ----------------- SEDE -----------------

router.put("/:id/host", requireMember, async (req, res) => {
  const event = req.event;
  const action = req.body?.action;

  if (action === "neutral") {
    const spot = req.body?.spot;
    if (!NEUTRAL_SPOTS.includes(spot)) throw badRequest("Punto neutro inválido");
    event.hostMode = "neutral";
    event.neutralSpot = spot;
  } else if (action === "set") {
    const userId = toId(req.body?.userId);
    const members = await memberIdsOf(event.id);
    if (!members.includes(userId)) throw badRequest("El anfitrión tiene que ser integrante de la juntada");
    event.hostMode = "house";
    event.currentHostId = userId;
  } else if (action === "rotate" || action === "cede") {
    if (action === "cede" && event.currentHostId !== req.user.id) {
      throw forbidden("Solo el anfitrión actual puede ceder su turno");
    }
    const view = await buildEventView(event.id, req.user.id);
    const next = pickNextHost(view);
    if (!next) throw badRequest("No hay otro integrante para ser anfitrión");
    event.hostMode = "house";
    event.currentHostId = next;
  } else {
    throw badRequest("Acción de sede inválida");
  }

  await event.save();
  await sendView(req, res);
});

// ----------------- TAREAS -----------------

router.post("/:id/tasks", requireMember, async (req, res) => {
  const title = cleanText(req.body?.title, "la tarea", 80);
  const assigneeId = req.body?.assigneeId == null || req.body.assigneeId === "" ? null : toId(req.body.assigneeId);

  if (assigneeId !== null) {
    const members = await memberIdsOf(req.event.id);
    if (!members.includes(assigneeId)) throw badRequest("El responsable tiene que ser integrante de la juntada");
  }

  await sequelize.transaction(async (transaction) => {
    const task = await Task.create({ eventId: req.event.id, title, maxAssignees: 1 }, { transaction });
    if (assigneeId !== null) await TaskAssignee.create({ taskId: task.id, userId: assigneeId }, { transaction });
  });
  await sendView(req, res, 201);
});

async function findTask(req) {
  const task = await Task.findOne({
    where: { id: toId(req.params.taskId), eventId: req.event.id },
    include: [{ model: TaskAssignee, as: "assignees" }]
  });
  if (!task) throw notFound("Esa tarea no existe");
  return task;
}

// Anotarme en una tarea
router.post("/:id/tasks/:taskId/assignees", requireMember, async (req, res) => {
  const task = await findTask(req);
  const alreadyIn = task.assignees.some(a => a.userId === req.user.id);
  if (!alreadyIn) {
    if (task.assignees.length >= task.maxAssignees) throw badRequest("Esa tarea ya tiene el cupo completo");
    await TaskAssignee.create({ taskId: task.id, userId: req.user.id });
  }
  await sendView(req, res);
});

// Quitarme de una tarea
router.delete("/:id/tasks/:taskId/assignees", requireMember, async (req, res) => {
  const task = await findTask(req);
  await TaskAssignee.destroy({ where: { taskId: task.id, userId: req.user.id } });
  await sendView(req, res);
});

// ----------------- GASTOS -----------------

router.post("/:id/expenses", requireMember, async (req, res) => {
  const description = cleanText(req.body?.description, "el concepto del gasto", 80);
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw badRequest("Ingresá un monto mayor a 0");
  if (amount > 9999999999) throw badRequest("El monto es demasiado grande");

  const members = await memberIdsOf(req.event.id);
  const payerId = toId(req.body?.payerId);
  if (!members.includes(payerId)) throw badRequest("Quien pagó tiene que ser integrante de la juntada");

  const participantIds = Array.isArray(req.body?.participantIds)
    ? [...new Set(req.body.participantIds.map(toId))]
    : [];
  if (participantIds.length === 0) throw badRequest("Elegí al menos un integrante para dividir el gasto");
  if (participantIds.some(id => !members.includes(id))) throw badRequest("Solo se puede dividir entre integrantes de la juntada");

  let taskId = null;
  if (req.body?.taskId != null && req.body.taskId !== "") {
    const task = await Task.findOne({ where: { id: toId(req.body.taskId), eventId: req.event.id } });
    if (!task) throw badRequest("Esa tarea no existe");
    taskId = task.id;
  }

  await sequelize.transaction(async (transaction) => {
    const expense = await Expense.create({
      eventId: req.event.id,
      description,
      amount: Math.round(amount * 100) / 100,
      payerId,
      createdById: req.user.id,
      taskId
    }, { transaction });
    await ExpenseParticipant.bulkCreate(
      participantIds.map(userId => ({ expenseId: expense.id, userId })),
      { transaction }
    );
  });
  await sendView(req, res, 201);
});

router.delete("/:id/expenses/:expenseId", requireMember, async (req, res) => {
  const expense = await Expense.findOne({ where: { id: toId(req.params.expenseId), eventId: req.event.id } });
  if (!expense) throw notFound("Ese gasto no existe");

  const canDelete = [expense.createdById, expense.payerId, req.event.organizerId].includes(req.user.id);
  if (!canDelete) throw forbidden("Solo quien cargó el gasto, quien pagó o quien organizó pueden borrarlo");

  await expense.destroy();
  await sendView(req, res);
});

module.exports = router;
