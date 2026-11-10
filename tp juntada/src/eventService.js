/**
 * Lógica de negocio compartida entre las rutas y el script de datos de ejemplo.
 */
const { sequelize, Event, EventMember, DateOption, DateVote, Task } = require("./models");

const DEADLINE_HOURS = [4, 6, 12, 24];

// Toda juntada arranca con estas tareas; la limpieza es el compromiso de orden mutuo
const DEFAULT_TASKS = [
  { title: "Limpieza final", maxAssignees: 2, isPact: true },
  { title: "Hielo y vasos", maxAssignees: 1 },
  { title: "Bebidas", maxAssignees: 2 },
  { title: "Snacks", maxAssignees: 2 }
];

/**
 * Crea una juntada con su organizador como integrante confirmado y anfitrión inicial.
 * @returns {Promise<Event>}
 */
async function createEvent({ organizerId, title, dateLabels, deadline, tasks = DEFAULT_TASKS }) {
  return sequelize.transaction(async (transaction) => {
    const event = await Event.create({
      title,
      deadline,
      organizerId,
      hostMode: "house",
      currentHostId: organizerId
    }, { transaction });

    await EventMember.create({ eventId: event.id, userId: organizerId, status: "yes" }, { transaction });

    for (const label of dateLabels) {
      await DateOption.create({ eventId: event.id, label }, { transaction });
    }
    for (const task of tasks) {
      await Task.create({ ...task, eventId: event.id }, { transaction });
    }
    return event;
  });
}

/**
 * Agrega una opción de fecha (o reutiliza una igual) y la vota quien la propone.
 */
async function proposeDate({ eventId, userId, label }) {
  return sequelize.transaction(async (transaction) => {
    const existing = await DateOption.findAll({ where: { eventId }, transaction });
    let option = existing.find(d => d.label.toLowerCase() === label.toLowerCase());
    if (!option) {
      option = await DateOption.create({ eventId, label, proposedById: userId }, { transaction });
    }
    await DateVote.findOrCreate({ where: { dateOptionId: option.id, userId }, transaction });
    return option;
  });
}

/**
 * Próximo anfitrión según la rotación equitativa: el integrante que menos veces recibió
 * (sin contar al anfitrión actual). En empate, el que se sumó primero.
 */
function pickNextHost(view) {
  const candidates = view.hostInfo.history.filter(h => h.userId !== view.hostInfo.currentHost);
  return candidates.length > 0 ? candidates[0].userId : null;
}

module.exports = { DEADLINE_HOURS, DEFAULT_TASKS, createEvent, proposeDate, pickNextHost };
