/**
 * Acceso a datos de opciones de fecha y sus votos.
 */
const { DateOption, DateVote } = require("../models");

const dateRepository = {
  listByEvent(eventId, options = {}) {
    return DateOption.findAll({ where: { eventId }, order: [["id", "ASC"]], ...options });
  },

  findInEvent(dateOptionId, eventId) {
    return DateOption.findOne({ where: { id: dateOptionId, eventId } });
  },

  create({ eventId, label, proposedById = null }, options = {}) {
    return DateOption.create({ eventId, label, proposedById }, options);
  },

  // Agrega el voto si no existe
  addVote(dateOptionId, userId, options = {}) {
    return DateVote.findOrCreate({ where: { dateOptionId, userId }, ...options });
  },

  // Devuelve la cantidad de votos borrados (0 si no había votado)
  removeVote(dateOptionId, userId) {
    return DateVote.destroy({ where: { dateOptionId, userId } });
  }
};

module.exports = dateRepository;
