/**
 * Carga datos de ejemplo: los integrantes del grupo y dos juntadas.
 *
 * ⚠️  BORRA TODAS LAS TABLAS y las vuelve a crear. Usar solo para desarrollo o demos.
 *     npm run seed
 *
 * Usuarios de prueba (todos con la contraseña: juntapp123):
 *   simon, lucas, mateo, pedro, salvador, robertino
 */
const { sequelize, ensureDatabase } = require("../config/database");
require("../models");
const userRepository = require("../repositories/userRepository");
const eventRepository = require("../repositories/eventRepository");
const memberRepository = require("../repositories/memberRepository");
const dateRepository = require("../repositories/dateRepository");
const taskRepository = require("../repositories/taskRepository");
const expenseRepository = require("../repositories/expenseRepository");
const { hashPassword } = require("../services/authService");
const { createEventRecord } = require("../services/eventService");

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
    await memberRepository.upsert({ eventId, userId: Number(userId), status });
  }
}

async function addVotes(eventId, votesByLabel) {
  for (const option of await dateRepository.listByEvent(eventId)) {
    for (const userId of votesByLabel[option.label] || []) {
      await dateRepository.addVote(option.id, userId);
    }
  }
}

async function assignTasks(eventId, assigneesByTitle) {
  for (const task of await taskRepository.listByEvent(eventId)) {
    for (const userId of assigneesByTitle[task.title] || []) {
      await taskRepository.addAssignee(task.id, userId);
    }
  }
}

async function addExpense(eventId, { description, amount, payerId, participantIds }) {
  await expenseRepository.createWithParticipants(
    { eventId, description, amount, payerId, createdById: payerId },
    participantIds
  );
}

async function seed() {
  await ensureDatabase();
  await sequelize.sync({ force: true });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const u = {};
  for (const data of USERS) {
    const user = await userRepository.create({ ...data, passwordHash });
    u[data.username] = user.id;
  }

  // Juntadas pasadas, para que la rotación de anfitrión tenga historial
  const pastHosts = ["salvador", "salvador", "salvador", "simon", "simon", "mateo", "mateo", "lucas", "pedro"];
  for (const [i, host] of pastHosts.entries()) {
    await createEventRecord({
      organizerId: u[host],
      title: `Juntada anterior #${i + 1}`,
      dateLabels: ["Sábado 22:00 hs"],
      deadline: daysAgo(15 + i * 10),
      tasks: []
    });
  }

  // Juntada 1
  const fds = await createEventRecord({
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
  await eventRepository.update(fds, { currentHostId: u.lucas });
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
  const asado = await createEventRecord({
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
  await eventRepository.update(asado, { currentHostId: u.simon });
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

  console.log(`✅ Datos de ejemplo cargados: ${USERS.length} usuarios, ${pastHosts.length + 2} juntadas.`);
  console.log(`   Usuarios: ${USERS.map(x => x.username).join(", ")} — contraseña: ${DEMO_PASSWORD}`);
}

seed()
  .catch(err => {
    console.error("❌ Error cargando los datos de ejemplo:", err.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
