/**
 * Controlador de gastos.
 */
const expenseService = require("../services/expenseService");

async function add(req, res) {
  res.status(201).json(await expenseService.add(req.params.id, req.user.id, req.body ?? {}));
}

async function remove(req, res) {
  res.json(await expenseService.remove(req.params.id, req.user.id, req.params.expenseId));
}

module.exports = { add, remove };
