/**
 * Controlador de tareas.
 */
const taskService = require("../services/taskService");

async function create(req, res) {
  res.status(201).json(await taskService.create(req.params.id, req.user.id, req.body ?? {}));
}

async function claim(req, res) {
  res.json(await taskService.claim(req.params.id, req.user.id, req.params.taskId));
}

async function unclaim(req, res) {
  res.json(await taskService.unclaim(req.params.id, req.user.id, req.params.taskId));
}

module.exports = { create, claim, unclaim };
