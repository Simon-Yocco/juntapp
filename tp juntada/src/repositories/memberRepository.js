/**
 * Acceso a datos de integrantes de una juntada (y su respuesta de asistencia).
 */
const { EventMember } = require("../models");

const memberRepository = {
  find(eventId, userId) {
    return EventMember.findOne({ where: { eventId, userId } });
  },

  create({ eventId, userId, status = null }, options = {}) {
    return EventMember.create({ eventId, userId, status }, options);
  },

  // Lo suma si no estaba; devuelve [member, created]
  findOrCreate(eventId, userId) {
    return EventMember.findOrCreate({ where: { eventId, userId } });
  },

  setStatus(member, status) {
    return member.update({ status });
  },

  // Crea o actualiza (usado por los datos de ejemplo)
  upsert({ eventId, userId, status }) {
    return EventMember.upsert({ eventId, userId, status });
  },

  async listUserIds(eventId) {
    const members = await EventMember.findAll({ where: { eventId }, attributes: ["userId"] });
    return members.map(m => m.userId);
  }
};

module.exports = memberRepository;
