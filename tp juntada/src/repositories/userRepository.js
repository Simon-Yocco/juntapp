/**
 * Acceso a datos de usuarios.
 */
const { User } = require("../models");

const userRepository = {
  count() {
    return User.count();
  },

  findById(id) {
    return User.findByPk(id);
  },

  findByUsername(username) {
    return User.findOne({ where: { username } });
  },

  create({ username, displayName, passwordHash }, options = {}) {
    return User.create({ username, displayName, passwordHash }, options);
  }
};

module.exports = userRepository;
