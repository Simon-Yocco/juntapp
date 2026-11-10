/**
 * Rutas de juntadas: /api/events (todas requieren sesión; ver routes/index.js).
 * Las que modifican devuelven la juntada actualizada.
 */
const express = require("express");
const eventController = require("../controllers/eventController");
const dateController = require("../controllers/dateController");
const taskController = require("../controllers/taskController");
const hostController = require("../controllers/hostController");
const expenseController = require("../controllers/expenseController");

const router = express.Router();

// Juntadas
router.get("/", eventController.list);
router.post("/", eventController.create);
router.post("/join-by-code", eventController.joinByCode);
router.get("/:id", eventController.get);
router.delete("/:id", eventController.remove);
router.post("/:id/join", eventController.join);

// Asistencia
router.put("/:id/rsvp", eventController.setRsvp);

// Fechas
router.post("/:id/dates", dateController.propose);
router.post("/:id/dates/:dateId/vote", dateController.toggleVote);

// Sede
router.put("/:id/host", hostController.update);

// Tareas
router.post("/:id/tasks", taskController.create);
router.post("/:id/tasks/:taskId/assignees", taskController.claim);
router.delete("/:id/tasks/:taskId/assignees", taskController.unclaim);

// Gastos
router.post("/:id/expenses", expenseController.add);
router.delete("/:id/expenses/:expenseId", expenseController.remove);

module.exports = router;
