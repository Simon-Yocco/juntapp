/**
 * Modelos de la base de datos y sus relaciones.
 *
 * users ─┬─< event_members >── events ──< date_options ──< date_votes
 *        │                       ├──< tasks ──< task_assignees
 *        │                       └──< expenses ──< expense_participants
 */
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const USER_ID = DataTypes.INTEGER.UNSIGNED;

// ----------------- USUARIOS -----------------
const User = sequelize.define("User", {
  id: { type: USER_ID, autoIncrement: true, primaryKey: true },
  username: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
    validate: { is: /^[a-z0-9_.]{3,30}$/ }
  },
  displayName: {
    type: DataTypes.STRING(40),
    allowNull: false,
    validate: { len: [1, 40] }
  },
  passwordHash: { type: DataTypes.STRING(100), allowNull: false }
}, { tableName: "users" });

// ----------------- JUNTADAS -----------------
const Event = sequelize.define("Event", {
  // UUID para que el link de invitación no se pueda adivinar
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  title: { type: DataTypes.STRING(80), allowNull: false, validate: { len: [1, 80] } },
  // Código corto para que cualquier usuario se una escribiéndolo (ej: K7MQ2X)
  joinCode: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true,
    validate: { is: /^[A-HJ-NP-Z2-9]{6}$/ }
  },
  deadline: { type: DataTypes.DATE, allowNull: false },
  hostMode: { type: DataTypes.ENUM("house", "neutral"), allowNull: false, defaultValue: "house" },
  neutralSpot: { type: DataTypes.STRING(60), allowNull: true }
}, { tableName: "events" });

Event.belongsTo(User, { as: "organizer", foreignKey: { name: "organizerId", allowNull: false } });
Event.belongsTo(User, { as: "currentHost", foreignKey: { name: "currentHostId", allowNull: true }, onDelete: "SET NULL" });

// Integrantes de una juntada y su respuesta de asistencia (null = sin confirmar)
const EventMember = sequelize.define("EventMember", {
  eventId: { type: DataTypes.UUID, primaryKey: true },
  userId: { type: USER_ID, primaryKey: true },
  status: { type: DataTypes.ENUM("yes", "maybe", "no"), allowNull: true }
}, { tableName: "event_members" });

Event.hasMany(EventMember, { as: "members", foreignKey: "eventId", onDelete: "CASCADE" });
EventMember.belongsTo(Event, { foreignKey: "eventId" });
EventMember.belongsTo(User, { as: "user", foreignKey: "userId", onDelete: "CASCADE" });

// ----------------- FECHAS Y VOTOS -----------------
const DateOption = sequelize.define("DateOption", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  label: { type: DataTypes.STRING(40), allowNull: false, validate: { len: [1, 40] } }
}, { tableName: "date_options" });

Event.hasMany(DateOption, { as: "dates", foreignKey: { name: "eventId", allowNull: false }, onDelete: "CASCADE" });
DateOption.belongsTo(Event, { foreignKey: "eventId" });
DateOption.belongsTo(User, { as: "proposedBy", foreignKey: { name: "proposedById", allowNull: true }, onDelete: "SET NULL" });

const DateVote = sequelize.define("DateVote", {
  dateOptionId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  userId: { type: USER_ID, primaryKey: true }
}, { tableName: "date_votes" });

DateOption.hasMany(DateVote, { as: "votes", foreignKey: "dateOptionId", onDelete: "CASCADE" });
DateVote.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

// ----------------- TAREAS -----------------
const Task = sequelize.define("Task", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING(80), allowNull: false, validate: { len: [1, 80] } },
  maxAssignees: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1, validate: { min: 1, max: 20 } },
  // Compromiso de orden mutuo (limpieza final)
  isPact: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: "tasks" });

Event.hasMany(Task, { as: "tasks", foreignKey: { name: "eventId", allowNull: false }, onDelete: "CASCADE" });
Task.belongsTo(Event, { foreignKey: "eventId" });

const TaskAssignee = sequelize.define("TaskAssignee", {
  taskId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  userId: { type: USER_ID, primaryKey: true }
}, { tableName: "task_assignees" });

Task.hasMany(TaskAssignee, { as: "assignees", foreignKey: "taskId", onDelete: "CASCADE" });
TaskAssignee.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

// ----------------- GASTOS -----------------
const Expense = sequelize.define("Expense", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  description: { type: DataTypes.STRING(80), allowNull: false, validate: { len: [1, 80] } },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01 } // regla de negocio: el monto siempre es mayor a 0
  }
}, { tableName: "expenses" });

Event.hasMany(Expense, { as: "expenses", foreignKey: { name: "eventId", allowNull: false }, onDelete: "CASCADE" });
Expense.belongsTo(Event, { foreignKey: "eventId" });
Expense.belongsTo(User, { as: "payer", foreignKey: { name: "payerId", allowNull: false } });
Expense.belongsTo(User, { as: "createdBy", foreignKey: { name: "createdById", allowNull: true }, onDelete: "SET NULL" });
// Gasto asociado a una tarea (opcional; pedido en el informe de testing)
Expense.belongsTo(Task, { as: "task", foreignKey: { name: "taskId", allowNull: true }, onDelete: "SET NULL" });

const ExpenseParticipant = sequelize.define("ExpenseParticipant", {
  expenseId: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
  userId: { type: USER_ID, primaryKey: true }
}, { tableName: "expense_participants" });

Expense.hasMany(ExpenseParticipant, { as: "participants", foreignKey: "expenseId", onDelete: "CASCADE" });
ExpenseParticipant.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE" });

module.exports = {
  sequelize,
  User,
  Event,
  EventMember,
  DateOption,
  DateVote,
  Task,
  TaskAssignee,
  Expense,
  ExpenseParticipant
};
