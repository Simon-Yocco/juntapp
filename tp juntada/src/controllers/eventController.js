/**
 * Controlador de juntadas y asistencia: lee el pedido, llama al servicio y responde.
 * No tiene reglas de negocio ni acceso a la base.
 */
const eventService = require("../services/eventService");

async function list(req, res) {
  res.json(await eventService.listForUser(req.user.id));
}

async function create(req, res) {
  res.status(201).json(await eventService.create(req.user.id, req.body ?? {}));
}

async function get(req, res) {
  res.json(await eventService.getForMember(req.params.id, req.user.id));
}

async function join(req, res) {
  res.json(await eventService.join(req.params.id, req.user.id));
}

async function remove(req, res) {
  await eventService.remove(req.params.id, req.user.id);
  res.json({ ok: true });
}

async function setRsvp(req, res) {
  res.json(await eventService.setRsvp(req.params.id, req.user.id, req.body?.status));
}

module.exports = { list, create, get, join, remove, setRsvp };
