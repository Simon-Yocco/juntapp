/**
 * Capa de presentación: convierte una juntada de la base en el JSON que usa el front.
 * Funciones puras (no consultan la base).
 * Las personas se identifican por userId; el nombre visible viene en `attendees`.
 */

// Fecha con más votos (en empate, la primera que se propuso)
function pickWinningDate(dates) {
  let winner = null;
  dates.forEach(d => {
    if (!winner || d.votes.length > winner.votes.length) winner = d;
  });
  return winner;
}

/**
 * @param event        juntada cargada con eventRepository.findWithDetails
 * @param hostCounts   { [userId]: { count, lastDate } } de eventRepository.countHostingsByUsers
 * @param currentUserId usuario que pide la juntada
 */
function presentEvent(event, hostCounts, currentUserId) {
  const isHouse = event.hostMode === "house";

  const attendees = event.members.map(m => ({
    userId: m.userId,
    name: m.user.displayName,
    username: m.user.username,
    status: m.status,
    isHost: isHouse && m.userId === event.currentHostId
  }));

  // Ordenado de menos a más veces anfitrión (base de la rotación equitativa)
  const history = attendees
    .map(a => ({
      userId: a.userId,
      name: a.name,
      count: hostCounts[a.userId]?.count || 0,
      lastDate: hostCounts[a.userId]?.lastDate || null
    }))
    .sort((a, b) => a.count - b.count);

  return {
    id: event.id,
    title: event.title,
    joinCode: event.joinCode,
    deadline: event.deadline,
    organizerId: event.organizerId,
    organizer: event.organizer.displayName,
    isOrganizer: event.organizerId === currentUserId,
    attendees,
    dates: event.dates.map(d => ({
      id: d.id,
      label: d.label,
      votes: d.votes.map(v => v.userId),
      proposedBy: d.proposedBy ? d.proposedBy.displayName : null
    })),
    hostInfo: {
      mode: event.hostMode,
      currentHost: isHouse ? event.currentHostId : null,
      neutralSpot: event.neutralSpot ? { name: event.neutralSpot } : null,
      history
    },
    tasks: event.tasks.map(t => ({
      id: t.id,
      title: t.title,
      maxAssignees: t.maxAssignees,
      isPact: t.isPact,
      assignedTo: t.assignees.map(a => a.userId)
    })),
    expenses: event.expenses.map(e => ({
      id: e.id,
      desc: e.description,
      amount: Number(e.amount),
      payer: e.payerId,
      participants: e.participants.map(p => p.userId),
      taskId: e.taskId,
      createdById: e.createdById
    }))
  };
}

// Versión resumida para la lista de "Tus Juntadas"
function presentEventSummary(view) {
  const winner = pickWinningDate(view.dates);
  const hostName = view.hostInfo.mode === "house"
    ? (view.attendees.find(a => a.userId === view.hostInfo.currentHost)?.name || "A definir")
    : (view.hostInfo.neutralSpot?.name || "Punto neutro");

  return {
    id: view.id,
    title: view.title,
    organizer: view.organizer,
    winnerDate: winner ? winner.label : "A coordinar",
    hostName,
    confirmedCount: view.attendees.filter(a => a.status === "yes").length
  };
}

function presentUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

module.exports = { presentEvent, presentEventSummary, presentUser, pickWinningDate };
