/**
 * Acceso a datos de gastos y entre quiénes se dividen.
 */
const { Expense, ExpenseParticipant } = require("../models");

const expenseRepository = {
  findInEvent(expenseId, eventId) {
    return Expense.findOne({ where: { id: expenseId, eventId } });
  },

  async createWithParticipants({ eventId, description, amount, payerId, createdById, taskId = null }, participantIds, options = {}) {
    const expense = await Expense.create({ eventId, description, amount, payerId, createdById, taskId }, options);
    await ExpenseParticipant.bulkCreate(
      participantIds.map(userId => ({ expenseId: expense.id, userId })),
      options
    );
    return expense;
  },

  destroy(expense) {
    return expense.destroy();
  }
};

module.exports = expenseRepository;
