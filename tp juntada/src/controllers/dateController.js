/**
 * Controlador de fechas.
 */
const dateService = require("../services/dateService");

async function propose(req, res) {
  res.status(201).json(await dateService.propose(req.params.id, req.user.id, req.body ?? {}));
}

async function toggleVote(req, res) {
  res.json(await dateService.toggleVote(req.params.id, req.user.id, req.params.dateId));
}

module.exports = { propose, toggleVote };
