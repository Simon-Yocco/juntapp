/**
 * Acceso a datos de tareas y sus responsables.
 */
const { Task, TaskAssignee } = require("../models");

const taskRepository = {
  listByEvent(eventId) {
    return Task.findAll({ where: { eventId }, order: [["id", "ASC"]] });
  },

  // Tarea de una juntada, con sus responsables
  findInEvent(taskId, eventId) {
    return Task.findOne({
      where: { id: taskId, eventId },
      include: [{ model: TaskAssignee, as: "assignees" }]
    });
  },

  create({ eventId, title, maxAssignees = 1, isPact = false }, options = {}) {
    return Task.create({ eventId, title, maxAssignees, isPact }, options);
  },

  addAssignee(taskId, userId, options = {}) {
    return TaskAssignee.create({ taskId, userId }, options);
  },

  removeAssignee(taskId, userId) {
    return TaskAssignee.destroy({ where: { taskId, userId } });
  }
};

module.exports = taskRepository;
