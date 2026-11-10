/**
 * Controlador de sede (anfitrión / punto neutro).
 */
const hostService = require("../services/hostService");

async function update(req, res) {
  res.json(await hostService.update(req.params.id, req.user.id, req.body ?? {}));
}

module.exports = { update };
