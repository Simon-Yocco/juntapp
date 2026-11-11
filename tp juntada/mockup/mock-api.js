/**
 * API simulada para el mockup (JUNTAPP_mockup.html).
 *
 * Reemplaza a public/js/api.js: expone el mismo `api` y `ApiError`, pero en lugar de llamar
 * al servidor resuelve todo en memoria con las mismas reglas de negocio que el backend
 * (src/services) y devuelve el mismo JSON (src/views/eventPresenter.js).
 *
 * No hay persistencia: al recargar la página se vuelve a los datos de ejemplo.
 * Lo usa src/scripts/buildMockup.js para armar el HTML único.
 */
class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const mockApi = (() => {
  // ----------------- ERRORES -----------------
  const badRequest = (msg) => new ApiError(400, msg);
  const unauthorized = (msg) => new ApiError(401, msg);
  const forbidden = (msg, code) => new ApiError(403, msg, code);
  const notFound = (msg) => new ApiError(404, msg);
  const conflict = (msg) => new ApiError(409, msg);

  // ----------------- CONSTANTES (iguales al backend) -----------------
  const DEMO_PASSWORD = "juntapp123";
  const DEADLINE_HOURS = [6, 12, 24, 48, 72, 168];
  const RSVP_STATUSES = ["yes", "maybe", "no"];
  const MAX_DATE_LABEL = 40;
  const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const NEUTRAL_SPOTS = ["Bar / Birrería", "Plaza / Parque"];
  const MAX_AMOUNT = 9999999999;
  const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
  const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
  const DEFAULT_TASKS = [
    { title: "Limpieza final", maxAssignees: 2, isPact: true },
    { title: "Hielo y vasos", maxAssignees: 1 },
    { title: "Bebidas", maxAssignees: 2 },
    { title: "Snacks", maxAssignees: 2 }
  ];

  // ----------------- "BASE DE DATOS" EN MEMORIA -----------------
  const db = { users: [], events: [] };
  let nextId = 1;
  let createdSeq = 0;
  let sessionUserId = null;

  const newId = () => nextId++;
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }));
  const hoursFromNow = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

  // ----------------- VALIDACIONES (como src/utils/validators.js) -----------------
  function requireText(value, field, maxLength) {
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) throw badRequest(`Completá ${field}`);
    if (text.length > maxLength) {
      throw badRequest(`${field[0].toUpperCase() + field.slice(1)} puede tener hasta ${maxLength} caracteres`);
    }
    return text;
  }
  function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
  const parseOptionalId = (value) => (value == null || value === "" ? null : parseId(value));
  const isValidTime = (v) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  const normalizeJoinCode = (v) => (typeof v === "string" ? v.toUpperCase().replace(/[\s-]/g, "") : "");

  function generateUniqueJoinCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
      let code = "";
      for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      if (!db.events.some(e => e.joinCode === code)) return code;
    }
    throw new Error("No se pudo generar un código único para la juntada");
  }

  // ----------------- ACCESO -----------------
  const userById = (id) => db.users.find(u => u.id === id);
  const presentUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName });

  function requireSession() {
    if (!sessionUserId) throw unauthorized("Iniciá sesión para continuar");
    return sessionUserId;
  }
  function requireEvent(eventId) {
    const event = db.events.find(e => e.id === eventId);
    if (!event) throw notFound("Esa juntada no existe o fue eliminada");
    return event;
  }
  function requireMember(eventId, userId) {
    const event = requireEvent(eventId);
    const membership = event.members.find(m => m.userId === userId);
    if (!membership) throw forbidden("No sos integrante de esta juntada", "NOT_MEMBER");
    return { event, membership };
  }
  function addMember(event, userId, status = null) {
    const existing = event.members.find(m => m.userId === userId);
    if (existing) return [existing, false];
    const membership = { userId, status };
    event.members.push(membership);
    return [membership, true];
  }

  // ----------------- PRESENTACIÓN (como src/views/eventPresenter.js) -----------------
  function countHostings(userIds, excludeEventId) {
    const result = {};
    db.events
      .filter(e => e.id !== excludeEventId && e.hostMode === "house" && userIds.includes(e.currentHostId))
      .forEach(e => {
        const r = result[e.currentHostId] || { count: 0, lastDate: null };
        r.count++;
        if (!r.lastDate || e.deadline > r.lastDate) r.lastDate = e.deadline;
        result[e.currentHostId] = r;
      });
    return result;
  }

  function buildView(event, currentUserId) {
    const isHouse = event.hostMode === "house";
    const attendees = event.members.map(m => {
      const u = userById(m.userId);
      return { userId: m.userId, name: u.displayName, username: u.username, status: m.status, isHost: isHouse && m.userId === event.currentHostId };
    });
    const hostCounts = countHostings(attendees.map(a => a.userId), event.id);
    const history = attendees
      .map(a => ({ userId: a.userId, name: a.name, count: hostCounts[a.userId]?.count || 0, lastDate: hostCounts[a.userId]?.lastDate || null }))
      .sort((a, b) => a.count - b.count);

    // Copia profunda: el front nunca toca la "base" directamente
    return JSON.parse(JSON.stringify({
      id: event.id,
      title: event.title,
      joinCode: event.joinCode,
      deadline: event.deadline,
      organizerId: event.organizerId,
      organizer: userById(event.organizerId).displayName,
      isOrganizer: event.organizerId === currentUserId,
      attendees,
      dates: event.dates.map(d => ({ id: d.id, label: d.label, votes: [...d.votes], proposedBy: d.proposedById ? userById(d.proposedById).displayName : null })),
      hostInfo: { mode: event.hostMode, currentHost: isHouse ? event.currentHostId : null, neutralSpot: event.neutralSpot ? { name: event.neutralSpot } : null, history },
      tasks: event.tasks.map(t => ({ id: t.id, title: t.title, maxAssignees: t.maxAssignees, isPact: !!t.isPact, assignedTo: [...t.assignees] })),
      expenses: event.expenses.map(e => ({ id: e.id, desc: e.description, amount: e.amount, payer: e.payerId, participants: [...e.participants], taskId: e.taskId, createdById: e.createdById }))
    }));
  }

  function presentEventSummary(view) {
    let winner = null;
    view.dates.forEach(d => { if (!winner || d.votes.length > winner.votes.length) winner = d; });
    const hostName = view.hostInfo.mode === "house"
      ? (view.attendees.find(a => a.userId === view.hostInfo.currentHost)?.name || "A definir")
      : (view.hostInfo.neutralSpot?.name || "Punto neutro");
    return { id: view.id, title: view.title, organizer: view.organizer, winnerDate: winner ? winner.label : "A coordinar", hostName, confirmedCount: view.attendees.filter(a => a.status === "yes").length };
  }

  // ----------------- REGLAS (como src/services) -----------------
  function createEventRecord({ organizerId, title, dateLabels, deadline, tasks = DEFAULT_TASKS }) {
    const event = {
      id: uuid(), title, joinCode: generateUniqueJoinCode(), deadline, organizerId,
      hostMode: "house", currentHostId: organizerId, neutralSpot: null, createdSeq: createdSeq++,
      members: [], dates: [], tasks: [], expenses: []
    };
    addMember(event, organizerId, "yes");
    dateLabels.forEach(label => event.dates.push({ id: newId(), label, proposedById: null, votes: [] }));
    tasks.forEach(t => event.tasks.push({ id: newId(), title: t.title, maxAssignees: t.maxAssignees, isPact: !!t.isPact, assignees: [] }));
    db.events.push(event);
    return event;
  }

  const auth = {
    register({ username, displayName, password }) {
      const cleanUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
      const cleanDisplayName = typeof displayName === "string" ? displayName.trim() : "";
      const cleanPassword = typeof password === "string" ? password : "";
      if (!USERNAME_PATTERN.test(cleanUsername)) throw badRequest("El usuario debe tener entre 3 y 30 caracteres: letras, números, punto o guion bajo");
      if (cleanDisplayName.length < 1 || cleanDisplayName.length > 40) throw badRequest("Ingresá tu nombre (hasta 40 caracteres)");
      if (cleanPassword.length < 6 || cleanPassword.length > 72) throw badRequest("La contraseña debe tener entre 6 y 72 caracteres");
      if (db.users.some(u => u.username === cleanUsername)) throw conflict("Ese usuario ya existe, elegí otro");
      // Mockup: la contraseña queda en memoria y se pierde al recargar (el backend real la guarda hasheada con bcrypt)
      const user = { id: newId(), username: cleanUsername, displayName: cleanDisplayName, password: cleanPassword };
      db.users.push(user);
      sessionUserId = user.id;
      return { user: presentUser(user) };
    },
    login({ username, password }) {
      const cleanUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
      const user = db.users.find(u => u.username === cleanUsername);
      if (!user || user.password !== password) throw unauthorized("Usuario o contraseña incorrectos");
      sessionUserId = user.id;
      return { user: presentUser(user) };
    }
  };

  const events = {
    list(userId) {
      return db.events
        .filter(e => e.members.some(m => m.userId === userId))
        .sort((a, b) => b.createdSeq - a.createdSeq)
        .map(e => presentEventSummary(buildView(e, userId)));
    },
    create(userId, { title, dates, hours }) {
      const cleanTitle = requireText(title, "el título", 80);
      const deadlineHours = Number(hours);
      if (!DEADLINE_HOURS.includes(deadlineHours)) throw badRequest("Elegí un plazo válido para confirmar");
      const dateLabels = [];
      (Array.isArray(dates) ? dates : []).forEach(d => {
        const label = typeof d === "string" ? d.trim() : "";
        if (label && label.length <= MAX_DATE_LABEL && !dateLabels.some(l => l.toLowerCase() === label.toLowerCase())) dateLabels.push(label);
      });
      if (dateLabels.length === 0) throw badRequest("Proponé al menos una fecha");
      const event = createEventRecord({ organizerId: userId, title: cleanTitle, dateLabels, deadline: hoursFromNow(deadlineHours) });
      return buildView(event, userId);
    },
    joinByCode(userId, rawCode) {
      const code = normalizeJoinCode(rawCode);
      if (!CODE_PATTERN.test(code)) throw badRequest("El código tiene 6 caracteres, por ejemplo K7MQ2X");
      const event = db.events.find(e => e.joinCode === code);
      if (!event) throw notFound("No hay ninguna juntada con ese código. Revisalo y probá de nuevo");
      const [, created] = addMember(event, userId);
      return { ...buildView(event, userId), justJoined: created };
    },
    get(eventId, userId) {
      const { event } = requireMember(eventId, userId);
      return buildView(event, userId);
    },
    join(eventId, userId) {
      const event = requireEvent(eventId);
      addMember(event, userId);
      return buildView(event, userId);
    },
    remove(eventId, userId) {
      const { event } = requireMember(eventId, userId);
      if (event.organizerId !== userId) throw forbidden("Solo quien organizó la juntada puede eliminarla");
      db.events = db.events.filter(e => e !== event);
      return { ok: true };
    },
    setRsvp(eventId, userId, status) {
      const { event, membership } = requireMember(eventId, userId);
      if (!RSVP_STATUSES.includes(status)) throw badRequest("Respuesta de asistencia inválida");
      membership.status = status;
      return buildView(event, userId);
    },
    proposeDate(eventId, userId, { day, time }) {
      const { event } = requireMember(eventId, userId);
      if (!DAYS.includes(day)) throw badRequest("Elegí un día");
      if (!isValidTime(time)) throw badRequest("Elegí un horario");
      const label = `${day} ${time} hs`;
      let option = event.dates.find(d => d.label.toLowerCase() === label.toLowerCase());
      if (!option) {
        option = { id: newId(), label, proposedById: userId, votes: [] };
        event.dates.push(option);
      }
      if (!option.votes.includes(userId)) option.votes.push(userId);
      return buildView(event, userId);
    },
    toggleVote(eventId, userId, dateId) {
      const { event } = requireMember(eventId, userId);
      const option = event.dates.find(d => d.id === parseId(dateId));
      if (!option) throw notFound("Esa fecha no existe");
      option.votes = option.votes.includes(userId) ? option.votes.filter(id => id !== userId) : [...option.votes, userId];
      return buildView(event, userId);
    },
    updateHost(eventId, userId, { action, userId: chosenUserId, spot }) {
      const { event } = requireMember(eventId, userId);
      const memberIds = event.members.map(m => m.userId);
      if (action === "neutral") {
        if (!NEUTRAL_SPOTS.includes(spot)) throw badRequest("Punto neutro inválido");
        event.hostMode = "neutral";
        event.neutralSpot = spot;
      } else if (action === "set") {
        const hostId = parseId(chosenUserId);
        if (!memberIds.includes(hostId)) throw badRequest("El anfitrión tiene que ser integrante de la juntada");
        event.hostMode = "house";
        event.currentHostId = hostId;
      } else if (action === "rotate" || action === "cede") {
        if (action === "cede" && event.currentHostId !== userId) throw forbidden("Solo el anfitrión actual puede ceder su turno");
        const view = buildView(event, userId);
        const candidates = view.hostInfo.history.filter(h => h.userId !== view.hostInfo.currentHost);
        if (candidates.length === 0) throw badRequest("No hay otro integrante para ser anfitrión");
        event.hostMode = "house";
        event.currentHostId = candidates[0].userId;
      } else {
        throw badRequest("Acción de sede inválida");
      }
      return buildView(event, userId);
    },
    createTask(eventId, userId, { title, assigneeId }) {
      const { event } = requireMember(eventId, userId);
      const cleanTitle = requireText(title, "la tarea", 80);
      const responsibleId = parseOptionalId(assigneeId);
      if (responsibleId !== null && !event.members.some(m => m.userId === responsibleId)) {
        throw badRequest("El responsable tiene que ser integrante de la juntada");
      }
      event.tasks.push({ id: newId(), title: cleanTitle, maxAssignees: 1, isPact: false, assignees: responsibleId !== null ? [responsibleId] : [] });
      return buildView(event, userId);
    },
    claimTask(eventId, userId, taskId) {
      const { event } = requireMember(eventId, userId);
      const task = event.tasks.find(t => t.id === parseId(taskId));
      if (!task) throw notFound("Esa tarea no existe");
      if (!task.assignees.includes(userId)) {
        if (task.assignees.length >= task.maxAssignees) throw badRequest("Esa tarea ya tiene el cupo completo");
        task.assignees.push(userId);
      }
      return buildView(event, userId);
    },
    unclaimTask(eventId, userId, taskId) {
      const { event } = requireMember(eventId, userId);
      const task = event.tasks.find(t => t.id === parseId(taskId));
      if (!task) throw notFound("Esa tarea no existe");
      task.assignees = task.assignees.filter(id => id !== userId);
      return buildView(event, userId);
    },
    addExpense(eventId, userId, { description, amount, payerId, participantIds, taskId }) {
      const { event } = requireMember(eventId, userId);
      const cleanDescription = requireText(description, "el concepto del gasto", 80);
      const cleanAmount = Number(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) throw badRequest("Ingresá un monto mayor a 0");
      if (cleanAmount > MAX_AMOUNT) throw badRequest("El monto es demasiado grande");
      const memberIds = event.members.map(m => m.userId);
      const cleanPayerId = parseId(payerId);
      if (!memberIds.includes(cleanPayerId)) throw badRequest("Quien pagó tiene que ser integrante de la juntada");
      const cleanParticipantIds = Array.isArray(participantIds) ? [...new Set(participantIds.map(parseId))] : [];
      if (cleanParticipantIds.length === 0) throw badRequest("Elegí al menos un integrante para dividir el gasto");
      if (cleanParticipantIds.some(id => !memberIds.includes(id))) throw badRequest("Solo se puede dividir entre integrantes de la juntada");
      let relatedTaskId = null;
      if (parseOptionalId(taskId) !== null) {
        const task = event.tasks.find(t => t.id === parseId(taskId));
        if (!task) throw badRequest("Esa tarea no existe");
        relatedTaskId = task.id;
      }
      event.expenses.push({
        id: newId(), description: cleanDescription, amount: Math.round(cleanAmount * 100) / 100,
        payerId: cleanPayerId, createdById: userId, taskId: relatedTaskId, participants: cleanParticipantIds
      });
      return buildView(event, userId);
    },
    removeExpense(eventId, userId, expenseId) {
      const { event } = requireMember(eventId, userId);
      const expense = event.expenses.find(e => e.id === parseId(expenseId));
      if (!expense) throw notFound("Ese gasto no existe");
      if (![expense.createdById, expense.payerId, event.organizerId].includes(userId)) {
        throw forbidden("Solo quien cargó el gasto, quien pagó o quien organizó pueden borrarlo");
      }
      event.expenses = event.expenses.filter(e => e !== expense);
      return buildView(event, userId);
    }
  };

  // ----------------- RUTAS (como src/routes) -----------------
  const ROUTES = [
    ["GET", /^\/auth\/me$/, () => {
      const user = userById(requireSession());
      return { user: presentUser(user) };
    }],
    ["POST", /^\/auth\/register$/, (p, body) => auth.register(body)],
    ["POST", /^\/auth\/login$/, (p, body) => auth.login(body)],
    ["POST", /^\/auth\/logout$/, () => { sessionUserId = null; return { ok: true }; }],
    ["GET", /^\/events$/, () => events.list(requireSession())],
    ["POST", /^\/events$/, (p, body) => events.create(requireSession(), body)],
    ["POST", /^\/events\/join-by-code$/, (p, body) => events.joinByCode(requireSession(), body.code)],
    ["GET", /^\/events\/([^/]+)$/, (p) => events.get(p[0], requireSession())],
    ["DELETE", /^\/events\/([^/]+)$/, (p) => events.remove(p[0], requireSession())],
    ["POST", /^\/events\/([^/]+)\/join$/, (p) => events.join(p[0], requireSession())],
    ["PUT", /^\/events\/([^/]+)\/rsvp$/, (p, body) => events.setRsvp(p[0], requireSession(), body.status)],
    ["POST", /^\/events\/([^/]+)\/dates$/, (p, body) => events.proposeDate(p[0], requireSession(), body)],
    ["POST", /^\/events\/([^/]+)\/dates\/([^/]+)\/vote$/, (p) => events.toggleVote(p[0], requireSession(), p[1])],
    ["PUT", /^\/events\/([^/]+)\/host$/, (p, body) => events.updateHost(p[0], requireSession(), body)],
    ["POST", /^\/events\/([^/]+)\/tasks$/, (p, body) => events.createTask(p[0], requireSession(), body)],
    ["POST", /^\/events\/([^/]+)\/tasks\/([^/]+)\/assignees$/, (p) => events.claimTask(p[0], requireSession(), p[1])],
    ["DELETE", /^\/events\/([^/]+)\/tasks\/([^/]+)\/assignees$/, (p) => events.unclaimTask(p[0], requireSession(), p[1])],
    ["POST", /^\/events\/([^/]+)\/expenses$/, (p, body) => events.addExpense(p[0], requireSession(), body)],
    ["DELETE", /^\/events\/([^/]+)\/expenses\/([^/]+)$/, (p) => events.removeExpense(p[0], requireSession(), p[1])]
  ];

  async function request(method, path, body) {
    // Una pequeña espera, para que se sienta como una app real
    await new Promise(resolve => setTimeout(resolve, 80));
    for (const [routeMethod, pattern, handler] of ROUTES) {
      if (routeMethod !== method) continue;
      const match = path.match(pattern);
      if (match) {
        const params = match.slice(1).map(decodeURIComponent);
        return handler(params, JSON.parse(JSON.stringify(body ?? {})));
      }
    }
    throw notFound("Ruta inexistente");
  }

  // ----------------- DATOS DE EJEMPLO (como src/seeders/sampleData.js) -----------------
  function loadSampleData() {
    const u = {};
    [
      ["simon", "Simon Yocco"], ["lucas", "Lucas Martino"], ["mateo", "Mateo Bertin"],
      ["pedro", "Pedro Ravanelli"], ["salvador", "Salvador Tosar"], ["robertino", "Robertino Joffre"]
    ].forEach(([username, displayName]) => {
      const user = { id: newId(), username, displayName, password: DEMO_PASSWORD };
      db.users.push(user);
      u[username] = user.id;
    });

    const setUp = (event, { host, members, votes, assignees, expenses }) => {
      event.currentHostId = host;
      Object.entries(members).forEach(([userId, status]) => {
        const [membership] = addMember(event, Number(userId));
        membership.status = status;
      });
      event.dates.forEach(d => { d.votes = [...(votes[d.label] || [])]; });
      event.tasks.forEach(t => { t.assignees = [...(assignees[t.title] || [])]; });
      expenses.forEach(e => event.expenses.push({
        id: newId(), description: e.description, amount: e.amount, payerId: e.payerId,
        createdById: e.payerId, taskId: null, participants: e.participantIds
      }));
    };

    // Juntada 1: están los 6
    const fds = createEventRecord({
      organizerId: u.salvador,
      title: "Juntada de Fin de Semana",
      dateLabels: ["Viernes 21:30 hs", "Sábado 22:00 hs", "Domingo 13:00 hs"],
      deadline: hoursFromNow(48),
      tasks: [
        { title: "Limpieza final", maxAssignees: 3, isPact: true },
        { title: "Hielo y vasos", maxAssignees: 1 },
        { title: "Gaseosas", maxAssignees: 2 },
        { title: "Bebidas", maxAssignees: 3 },
        { title: "Snacks y comida", maxAssignees: 2 },
        { title: "Música / Parlante", maxAssignees: 1 }
      ]
    });
    setUp(fds, {
      host: u.lucas,
      members: { [u.lucas]: "yes", [u.mateo]: "yes", [u.simon]: "yes", [u.pedro]: "maybe", [u.robertino]: "maybe" },
      votes: {
        "Viernes 21:30 hs": [u.simon, u.mateo],
        "Sábado 22:00 hs": [u.salvador, u.lucas, u.mateo, u.pedro, u.simon],
        "Domingo 13:00 hs": [u.robertino]
      },
      assignees: {
        "Limpieza final": [u.mateo, u.pedro],
        "Hielo y vasos": [u.salvador],
        "Bebidas": [u.simon],
        "Música / Parlante": [u.robertino]
      },
      expenses: [
        { description: "Bebidas", amount: 24000, payerId: u.simon, participantIds: [u.simon, u.salvador, u.mateo] },
        { description: "Hielo y vasos", amount: 6000, payerId: u.salvador, participantIds: [u.salvador, u.lucas, u.mateo, u.simon] }
      ]
    });

    // Juntada 2: pedro y robertino NO son parte (sirven para probar unirse con el código)
    const asado = createEventRecord({
      organizerId: u.mateo,
      title: "Asado de Fin de Mes",
      dateLabels: ["Domingo 13:00 hs", "Sábado 21:30 hs"],
      deadline: hoursFromNow(72),
      tasks: [
        { title: "Carne y carbón", maxAssignees: 2 },
        { title: "Limpieza y parrilla", maxAssignees: 2, isPact: true },
        { title: "Bebidas", maxAssignees: 3 }
      ]
    });
    setUp(asado, {
      host: u.simon,
      members: { [u.simon]: "yes", [u.salvador]: "yes", [u.lucas]: "maybe" },
      votes: { "Domingo 13:00 hs": [u.mateo, u.simon, u.salvador], "Sábado 21:30 hs": [u.lucas] },
      assignees: { "Carne y carbón": [u.mateo], "Limpieza y parrilla": [u.salvador], "Bebidas": [u.simon] },
      expenses: [{ description: "Carne y carbón", amount: 45000, payerId: u.mateo, participantIds: [u.mateo, u.simon, u.salvador] }]
    });
  }

  loadSampleData();
  return { request };
})();

const api = {
  get: (path) => mockApi.request("GET", path),
  post: (path, body = {}) => mockApi.request("POST", path, body),
  put: (path, body = {}) => mockApi.request("PUT", path, body),
  del: (path) => mockApi.request("DELETE", path)
};
