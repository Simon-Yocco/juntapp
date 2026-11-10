/**
 * Arma el JSON de una juntada tal como lo usa el front.
 * Las personas se identifican por userId; el nombre visible viene en `attendees`.
 */
const { Op, fn, col } = require("sequelize");
const {
  User, Event, EventMember, DateOption, DateVote, Task, TaskAssignee, Expense, ExpenseParticipant
} = require("./models");

const USER_ATTRS = ["id", "username", "displayName"];

async function loadEventWithDetails(eventId) {
  return Event.findByPk(eventId, {
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
}

// Cuántas veces fue anfitrión cada integrante en OTRAS juntadas (para la rotación equitativa)
async function loadHostCounts(eventId, userIds) {
  if (userIds.length === 0) return {};
  const rows = await Event.findAll({
    attributes: ["currentHostId", [fn("COUNT", col("id")), "count"], [fn("MAX", col("deadline")), "lastDate"]],
    where: { currentHostId: { [Op.in]: userIds }, hostMode: "house", id: { [Op.ne]: eventId } },
    group: ["currentHostId"],
    raw: true
  });
  const result = {};
  rows.forEach(r => { result[r.currentHostId] = { count: Number(r.count), lastDate: r.lastDate }; });
  return result;
}

// Fecha con más votos (en empate, la primera que se propuso)
function pickWinningDate(dates) {
  let winner = null;
  dates.forEach(d => {
    if (!winner || d.votes.length > winner.votes.length) winner = d;
  });
  return winner;
}

async function buildEventView(eventId, currentUserId) {
  const event = await loadEventWithDetails(eventId);
  if (!event) return null;

  const memberIds = event.members.map(m => m.userId);
  const hostCounts = await loadHostCounts(event.id, memberIds);
  const isHouse = event.hostMode === "house";

  const attendees = event.members.map(m => ({
    userId: m.userId,
    name: m.user.displayName,
    username: m.user.username,
    status: m.status,
    isHost: isHouse && m.userId === event.currentHostId
  }));

  const history = attendees
    .map(a => ({
      userId: a.userId,
      name: a.name,
      count: hostCounts[a.userId]?.count || 0,
      lastDate: hostCounts[a.userId]?.lastDate || null
    }))
    .sort((a, b) => a.count - b.count);

  return {
    id: event.id,
    title: event.title,
    deadline: event.deadline,
    organizerId: event.organizerId,
    organizer: event.organizer.displayName,
    isOrganizer: event.organizerId === currentUserId,
    attendees,
    dates: event.dates.map(d => ({
      id: d.id,
      label: d.label,
      votes: d.votes.map(v => v.userId),
      proposedBy: d.proposedBy ? d.proposedBy.displayName : null
    })),
    hostInfo: {
      mode: event.hostMode,
      currentHost: isHouse ? event.currentHostId : null,
      neutralSpot: event.neutralSpot ? { name: event.neutralSpot } : null,
      history
    },
    tasks: event.tasks.map(t => ({
      id: t.id,
      title: t.title,
      maxAssignees: t.maxAssignees,
      isPact: t.isPact,
      assignedTo: t.assignees.map(a => a.userId)
    })),
    expenses: event.expenses.map(e => ({
      id: e.id,
      desc: e.description,
      amount: Number(e.amount),
      payer: e.payerId,
      participants: e.participants.map(p => p.userId),
      taskId: e.taskId,
      createdById: e.createdById
    }))
  };
}

// Versión resumida para la lista de "Tus Juntadas"
function summarizeEventView(view) {
  const winner = pickWinningDate(view.dates);
  const hostName = view.hostInfo.mode === "house"
    ? (view.attendees.find(a => a.userId === view.hostInfo.currentHost)?.name || "A definir")
    : (view.hostInfo.neutralSpot?.name || "Punto neutro");

  return {
    id: view.id,
    title: view.title,
    organizer: view.organizer,
    winnerDate: winner ? winner.label : "A coordinar",
    hostName,
    confirmedCount: view.attendees.filter(a => a.status === "yes").length
  };
}

module.exports = { buildEventView, summarizeEventView, pickWinningDate };
