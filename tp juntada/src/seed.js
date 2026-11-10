/**
 * Carga datos de ejemplo: los integrantes del grupo y dos juntadas.
 *
 * ⚠️  BORRA TODAS LAS TABLAS y las vuelve a crear. Usar solo para desarrollo o demos.
 *     npm run seed
 *
 * Usuarios de prueba (todos con la contraseña: juntapp123):
 *   simon, lucas, mateo, pedro, salvador, robertino
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const bcrypt = require("bcryptjs");
const { ensureDatabase } = require("./db");
const {
  sequelize, User, Event, EventMember, DateOption, DateVote, Task, TaskAssignee, Expense, ExpenseParticipant
} = require("./models");
const { createEvent } = require("./eventService");

const DEMO_PASSWORD = "juntapp123";

const USERS = [
  { username: "simon", displayName: "Simon Yocco" },
  { username: "lucas", displayName: "Lucas Martino" },
  { username: "mateo", displayName: "Mateo Bertin" },
  { username: "pedro", displayName: "Pedro Ravanelli" },
  { username: "salvador", displayName: "Salvador Tosar" },
  { username: "robertino", displayName: "Robertino Joffre" }
];

const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000);
const daysAgo = (d) => new Date(Date.now() - d * 24 * 3600 * 1000);

async function addMembers(eventId, statuses) {
  for (const [userId, status] of Object.entries(statuses)) {
    await EventMember.upsert({ eventId, userId: Number(userId), status });
  }
}

async function addVotes(eventId, votesByLabel) {
  const options = await DateOption.findAll({ where: { eventId } });
  for (const option of options) {
    for (const userId of votesByLabel[option.label] || []) {
      await DateVote.create({ dateOptionId: option.id, userId });
    }
  }
}

async function assignTasks(eventId, assigneesByTitle) {
  const tasks = await Task.findAll({ where: { eventId } });
  for (const task of tasks) {
    for (const userId of assigneesByTitle[task.title] || []) {
      await TaskAssignee.create({ taskId: task.id, userId });
    }
  }
}

async function addExpense(eventId, { description, amount, payerId, participantIds }) {
  const expense = await Expense.create({ eventId, description, amount, payerId, createdById: payerId });
  await ExpenseParticipant.bulkCreate(participantIds.map(userId => ({ expenseId: expense.id, userId })));
}

async function seed() {
  await ensureDatabase();
  await sequelize.sync({ force: true });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const u = {};
  for (const data of USERS) {
    const user = await User.create({ ...data, passwordHash });
    u[data.username] = user.id;
  }

  // Juntadas pasadas, para que la rotación de anfitrión tenga historial
  const pastHosts = ["salvador", "salvador", "salvador", "simon", "simon", "mateo", "mateo", "lucas", "pedro"];
  for (const [i, host] of pastHosts.entries()) {
    const past = await createEvent({
      organizerId: u[host],
      title: `Juntada anterior #${i + 1}`,
      dateLabels: ["Sábado 22:00 hs"],
      deadline: daysAgo(15 + i * 10),
      tasks: []
    });
    await past.update({ createdAt: daysAgo(16 + i * 10) }, { silent: true });
  }

  // Juntada 1
  const fds = await createEvent({
    organizerId: u.salvador,
    title: "Juntada de Fin de Semana",
    dateLabels: ["Viernes 21:30 hs", "Sábado 22:00 hs", "Domingo 13:00 hs"],
    deadline: hoursFromNow(6),
    tasks: [
      { title: "Limpieza final", maxAssignees: 3, isPact: true },
      { title: "Hielo y vasos", maxAssignees: 1 },
      { title: "Gaseosas", maxAssignees: 2 },
      { title: "Bebidas", maxAssignees: 3 },
      { title: "Snacks y comida", maxAssignees: 2 },
      { title: "Música / Parlante", maxAssignees: 1 }
    ]
  });
  await fds.update({ currentHostId: u.lucas });
  await addMembers(fds.id, {
    [u.lucas]: "yes", [u.mateo]: "yes", [u.simon]: "yes", [u.pedro]: "maybe", [u.robertino]: "maybe"
  });
  await addVotes(fds.id, {
    "Viernes 21:30 hs": [u.simon, u.mateo],
    "Sábado 22:00 hs": [u.salvador, u.lucas, u.mateo, u.pedro, u.simon],
    "Domingo 13:00 hs": [u.robertino]
  });
  await assignTasks(fds.id, {
    "Limpieza final": [u.mateo, u.pedro],
    "Hielo y vasos": [u.salvador],
    "Bebidas": [u.simon],
    "Música / Parlante": [u.robertino]
  });
  await addExpense(fds.id, { description: "Bebidas", amount: 24000, payerId: u.simon, participantIds: [u.simon, u.salvador, u.mateo] });
  await addExpense(fds.id, { description: "Hielo y vasos", amount: 6000, payerId: u.salvador, participantIds: [u.salvador, u.lucas, u.mateo, u.simon] });

  // Juntada 2
  const asado = await createEvent({
    organizerId: u.mateo,
    title: "Asado de Fin de Mes",
    dateLabels: ["Domingo 13:00 hs", "Sábado 21:30 hs"],
    deadline: hoursFromNow(24),
    tasks: [
      { title: "Carne y carbón", maxAssignees: 2 },
      { title: "Limpieza y parrilla", maxAssignees: 2, isPact: true },
      { title: "Bebidas", maxAssignees: 3 }
    ]
  });
  await asado.update({ currentHostId: u.simon });
  await addMembers(asado.id, { [u.simon]: "yes", [u.salvador]: "yes", [u.lucas]: "maybe" });
  await addVotes(asado.id, {
    "Domingo 13:00 hs": [u.mateo, u.simon, u.salvador],
    "Sábado 21:30 hs": [u.lucas]
  });
  await assignTasks(asado.id, {
    "Carne y carbón": [u.mateo],
    "Limpieza y parrilla": [u.salvador],
    "Bebidas": [u.simon]
  });
  await addExpense(asado.id, { description: "Carne y carbón", amount: 45000, payerId: u.mateo, participantIds: [u.mateo, u.simon, u.salvador] });

  const eventCount = await Event.count();
  console.log(`✅ Datos de ejemplo cargados: ${USERS.length} usuarios y ${eventCount} juntadas.`);
  console.log(`   Usuarios: ${USERS.map(x => x.username).join(", ")} — contraseña: ${DEMO_PASSWORD}`);
}

seed()
  .catch(err => {
    console.error("❌ Error cargando los datos de ejemplo:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
