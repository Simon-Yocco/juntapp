/**
 * Acceso a datos de juntadas.
 */
const { Op, fn, col } = require("sequelize");
const {
  User, Event, EventMember, DateOption, DateVote, Task, TaskAssignee, Expense, ExpenseParticipant
} = require("../models");

const USER_ATTRS = ["id", "username", "displayName"];

const eventRepository = {
  findById(id, options = {}) {
    return Event.findByPk(id, options);
  },

  findByJoinCode(joinCode, options = {}) {
    return Event.findOne({ where: { joinCode }, ...options });
  },

  async joinCodeExists(joinCode, options = {}) {
    return (await Event.count({ where: { joinCode }, ...options })) > 0;
  },

  create(data, options = {}) {
    return Event.create(data, options);
  },

  update(event, changes, options = {}) {
    return event.update(changes, options);
  },

  destroy(event, options = {}) {
    return event.destroy(options);
  },

  // Juntada con todo lo que cuelga de ella (integrantes, fechas, votos, tareas, gastos)
  findWithDetails(id) {
    return Event.findByPk(id, {
      include: [
        { model: User, as: "organizer", attributes: USER_ATTRS },
        { model: EventMember, as: "members", include: [{ model: User, as: "user", attributes: USER_ATTRS }] },
        {
          model: DateOption, as: "dates",
          include: [
            { model: DateVote, as: "votes" },
            { model: User, as: "proposedBy", attributes: USER_ATTRS }
          ]
        },
        { model: Task, as: "tasks", include: [{ model: TaskAssignee, as: "assignees" }] },
        { model: Expense, as: "expenses", include: [{ model: ExpenseParticipant, as: "participants" }] }
      ],
      order: [
        [{ model: EventMember, as: "members" }, "createdAt", "ASC"],
        [{ model: DateOption, as: "dates" }, "id", "ASC"],
        [{ model: Task, as: "tasks" }, "id", "ASC"],
        [{ model: Expense, as: "expenses" }, "id", "ASC"]
      ]
    });
  },

  // Ids de las juntadas de un usuario, de la más nueva a la más vieja
  // (MySQL guarda la fecha sin milésimas: en empate, primero la de plazo más lejano)
  async findIdsByMember(userId) {
    const memberships = await EventMember.findAll({
      where: { userId },
      attributes: ["eventId"],
      include: [{ model: Event, attributes: ["createdAt", "deadline"] }],
      order: [[Event, "createdAt", "DESC"], [Event, "deadline", "DESC"]]
    });
    return memberships.map(m => m.eventId);
  },

  // Cuántas veces fue anfitrión cada usuario en OTRAS juntadas: { [userId]: { count, lastDate } }
  async countHostingsByUsers(userIds, { excludeEventId } = {}) {
    if (userIds.length === 0) return {};
    const where = { currentHostId: { [Op.in]: userIds }, hostMode: "house" };
    if (excludeEventId) where.id = { [Op.ne]: excludeEventId };

    const rows = await Event.findAll({
      attributes: ["currentHostId", [fn("COUNT", col("id")), "count"], [fn("MAX", col("deadline")), "lastDate"]],
      where,
      group: ["currentHostId"],
      raw: true
    });

    const result = {};
    rows.forEach(r => { result[r.currentHostId] = { count: Number(r.count), lastDate: r.lastDate }; });
    return result;
  }
};

module.exports = eventRepository;
