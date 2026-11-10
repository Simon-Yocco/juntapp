/**
 * Coordinador de Juntadas - Front conectado a la API (ver js/api.js).
 * Las personas se identifican por userId; el nombre visible sale de currentEvent.attendees.
 */

let currentUser = null;   // { id, username, displayName }
let currentEvent = null;  // juntada abierta, tal como la devuelve GET /api/events/:id
let pendingInviteId = null; // juntada a la que se quiere sumar alguien que todavía no inició sesión
let authMode = "login";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  setupAuthForm();
  initCountdown();
  setupSectionNavObserver();
  window.addEventListener("hashchange", handleHash);

  try {
    const { user } = await api.get("/auth/me");
    setCurrentUser(user);
  } catch (err) {
    if (err.status !== 401) console.warn(err);
  }
  handleHash();
}

// ----------------- UTILIDADES -----------------

// Escapa texto antes de insertarlo con innerHTML (nombres, títulos y conceptos los escriben los usuarios)
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nameOf(userId) {
  return currentEvent?.attendees.find(a => a.userId === userId)?.name || "Alguien";
}

function formatCurrency(amount) {
  return "$" + Number(amount || 0).toLocaleString("es-AR");
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function handleApiError(err) {
  if (err.status === 401) {
    setCurrentUser(null);
    showAuthView();
    return;
  }
  alert(err.message);
}

// Ejecuta una acción sobre la juntada abierta y re-renderiza con la respuesta del servidor
async function eventAction(method, path, body) {
  if (!currentEvent) return false;
  try {
    const methodFn = { POST: api.post, PUT: api.put, DELETE: api.del }[method];
    currentEvent = await methodFn(`/events/${currentEvent.id}${path}`, body);
    renderApp();
    return true;
  } catch (err) {
    handleApiError(err);
    return false;
  }
}

// ----------------- SESIÓN -----------------

function setCurrentUser(user) {
  currentUser = user;
  const headerUser = document.getElementById("header-user");
  const headerName = document.getElementById("header-user-name");
  if (headerUser) {
    headerUser.classList.toggle("hidden", !user);
    headerUser.classList.toggle("flex", !!user);
  }
  if (headerName) headerName.textContent = user ? user.displayName : "";
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegister = mode === "register";
  document.getElementById("auth-displayname-field")?.classList.toggle("hidden", !isRegister);
  document.getElementById("auth-submit").textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
  document.getElementById("auth-password").autocomplete = isRegister ? "new-password" : "current-password";

  const activeClasses = ["bg-white", "text-slate-900", "shadow-sm"];
  const inactiveClasses = ["text-slate-500"];
  const loginTab = document.getElementById("auth-tab-login");
  const registerTab = document.getElementById("auth-tab-register");
  [[loginTab, !isRegister], [registerTab, isRegister]].forEach(([tab, active]) => {
    activeClasses.forEach(c => tab.classList.toggle(c, active));
    inactiveClasses.forEach(c => tab.classList.toggle(c, !active));
  });
  showAuthError("");
}

function showAuthError(message) {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("hidden", !message);
}

function setupAuthForm() {
  setAuthMode("login");
  document.getElementById("auth-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("auth-username").value.trim();
    const password = document.getElementById("auth-password").value;
    const displayName = document.getElementById("auth-displayname").value.trim();

    if (!username || !password) {
      showAuthError("Completá usuario y contraseña");
      return;
    }
    if (authMode === "register" && !displayName) {
      showAuthError("Completá tu nombre");
      return;
    }

    const submitBtn = document.getElementById("auth-submit");
    submitBtn.disabled = true;
    try {
      const { user } = authMode === "register"
        ? await api.post("/auth/register", { username, password, displayName })
        : await api.post("/auth/login", { username, password });
      document.getElementById("auth-password").value = "";
      showAuthError("");
      setCurrentUser(user);
      handleHash();
    } catch (err) {
      showAuthError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });
}

async function logout() {
  try {
    await api.post("/auth/logout");
  } catch (err) {
    console.warn(err);
  }
  setCurrentUser(null);
  currentEvent = null;
  history.replaceState(null, "", window.location.pathname);
  showAuthView();
}

// ----------------- NAVEGACIÓN ENTRE VISTAS -----------------

function showOnly(viewId) {
  ["view-auth", "view-events-list", "view-event-detail"].forEach(id => {
    document.getElementById(id)?.classList.toggle("hidden", id !== viewId);
  });
}

function handleHash() {
  const hash = window.location.hash.substring(1);
  const eventId = hash.startsWith("event=") ? hash.replace("event=", "") : null;

  if (!currentUser) {
    pendingInviteId = eventId;
    showAuthView();
    return;
  }

  if (eventId) {
    openEventDetail(eventId, false);
    return;
  }
  showListView(false);
}

function showAuthView() {
  showOnly("view-auth");
  document.getElementById("auth-invite-notice")?.classList.toggle("hidden", !pendingInviteId);
  refreshIcons();
}

async function showListView(updateHash = true) {
  if (!currentUser) {
    showAuthView();
    return;
  }
  if (updateHash) history.replaceState(null, "", window.location.pathname);
  currentEvent = null;
  showOnly("view-events-list");

  try {
    const events = await api.get("/events");
    renderEventsList(events);
  } catch (err) {
    handleApiError(err);
  }
}

// Abre una juntada; si el usuario no es integrante (llegó por el link), lo suma
async function openEventDetail(eventId, updateHash = true) {
  try {
    try {
      currentEvent = await api.get(`/events/${encodeURIComponent(eventId)}`);
    } catch (err) {
      if (err.code !== "NOT_MEMBER") throw err;
      currentEvent = await api.post(`/events/${encodeURIComponent(eventId)}/join`);
    }
  } catch (err) {
    if (err.status === 404) {
      alert(err.message);
      showListView();
      return;
    }
    handleApiError(err);
    return;
  }

  pendingInviteId = null;
  if (updateHash) history.replaceState(null, "", `#event=${eventId}`);
  showOnly("view-event-detail");
  renderApp();
  positionSectionNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ----------------- BARRA DE NAVEGACIÓN POR SECCIONES -----------------

// Abre el desplegable (si está cerrado) y lleva la pantalla hasta esa sección
function goToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  if (section.tagName === "DETAILS") section.open = true;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
  setActiveNavChip(sectionId);
}

function setActiveNavChip(sectionId) {
  document.querySelectorAll("#section-nav [data-nav]").forEach(chip => {
    const isActive = chip.dataset.nav === sectionId;
    chip.classList.toggle("is-active", isActive);
    if (isActive) chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  });
}

// Ubica la barra justo debajo del encabezado (cuya altura cambia en celular)
function positionSectionNav() {
  const header = document.querySelector("header");
  const nav = document.getElementById("section-nav");
  if (!header || !nav) return;
  const headerHeight = header.offsetHeight;
  nav.style.top = headerHeight + "px";
  document.documentElement.style.setProperty("--section-offset", (headerHeight + nav.offsetHeight + 12) + "px");
}

// Marca en la barra la sección que se está viendo mientras se hace scroll
function setupSectionNavObserver() {
  positionSectionNav();
  window.addEventListener("resize", positionSectionNav);

  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) setActiveNavChip(entry.target.id);
    });
  }, { rootMargin: "-120px 0px -60% 0px" });

  document.querySelectorAll("#section-nav [data-nav]").forEach(chip => {
    const section = document.getElementById(chip.dataset.nav);
    if (section) observer.observe(section);
  });
}

// ----------------- LISTA DE JUNTADAS -----------------

function renderEventsList(events) {
  const container = document.getElementById("events-list-container");
  if (!container) return;

  if (events.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 clean-card p-6">
        <p class="text-xs text-slate-500 mb-3">No tenés juntadas todavía. Creá una o pedile el link a un amigo.</p>
        <button onclick="openNewEventModal()" class="text-xs px-3.5 py-1.5 rounded-md bg-slate-900 text-white font-medium">
          + Crear la primera juntada
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(event => `
    <div onclick="openEventDetail('${escapeHtml(event.id)}')"
         class="clean-card p-4 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-bold text-slate-900">${escapeHtml(event.title)}</h3>
          <span class="text-[10px] text-slate-400">por ${escapeHtml(event.organizer)}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span class="flex items-center gap-1">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${escapeHtml(event.winnerDate)}</span>
          </span>
          <span>·</span>
          <span class="flex items-center gap-1">
            <i data-lucide="home" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>${escapeHtml(event.hostName)}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
          ${event.confirmedCount} confirmados
        </span>
        <span class="text-xs text-slate-700 font-medium flex items-center gap-0.5">
          <span>Abrir</span>
          <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
        </span>
      </div>
    </div>
  `).join("");
  refreshIcons();
}

// ----------------- DETALLE DE LA JUNTADA -----------------

function renderApp() {
  if (!currentEvent) return;
  renderHeader();
  renderDateVoting();
  renderHostSection();
  renderChecklist();
  renderTaskAssigneeOptions();
  renderAttendeesSection();
  renderExpensesSection();
  updateCountdown();
  refreshIcons();
}

const RSVP_LABELS = { yes: "Asistís", maybe: "Estás en duda", no: "No vas" };

function renderHeader() {
  document.getElementById("event-title").textContent = currentEvent.title;
  document.getElementById("event-organizer").textContent = `Organiza ${currentEvent.organizer}`;
  document.getElementById("delete-event-btn")?.classList.toggle("hidden", !currentEvent.isOrganizer);

  const me = currentEvent.attendees.find(a => a.userId === currentUser.id);
  const statusEl = document.getElementById("rsvp-current-status");
  if (statusEl) {
    statusEl.innerHTML = me?.status
      ? `Respondés como <strong>${escapeHtml(currentUser.displayName)}</strong>: ${RSVP_LABELS[me.status]}`
      : `Respondés como <strong>${escapeHtml(currentUser.displayName)}</strong>. ¿Vas a ir?`;
  }
}

function renderDateVoting() {
  const container = document.getElementById("date-options-container");
  if (!container) return;

  let maxVotes = 0;
  let leaderId = null;
  let leaderLabel = "";
  currentEvent.dates.forEach(d => {
    if (d.votes.length > maxVotes) {
      maxVotes = d.votes.length;
      leaderId = d.id;
      leaderLabel = d.label;
    }
  });

  const summaryBadge = document.getElementById("summary-dates-badge");
  if (summaryBadge) summaryBadge.textContent = leaderLabel ? `· Preferida: ${leaderLabel}` : "";

  container.innerHTML = currentEvent.dates.map(date => {
    const isLeader = date.id === leaderId && maxVotes > 0;
    const voteCount = date.votes.length;
    const userVoted = date.votes.includes(currentUser.id);

    return `
      <div class="flex items-center justify-between p-2.5 rounded-lg border ${userVoted ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-200'}">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-semibold text-slate-900">${escapeHtml(date.label)}</span>
          ${isLeader ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">Más votada</span>' : ''}
          <span class="text-[11px] text-slate-400 font-medium">(${voteCount})</span>
          ${date.proposedBy ? `<span class="text-[10px] text-slate-400">· propuesta por ${escapeHtml(date.proposedBy)}</span>` : ''}
        </div>

        <div class="flex items-center gap-2">
          <button onclick="toggleDateVote(${date.id})"
                  class="text-xs px-2.5 py-1 rounded border transition-colors ${userVoted ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}">
            ${userVoted ? 'Votado' : 'Votar'}
          </button>
        </div>
      </div>
    `;
  }).join("");
}

function renderHostSection() {
  const hostNameEl = document.getElementById("current-host-name");
  const hostSummaryEl = document.getElementById("summary-host-badge");
  if (!hostNameEl) return;

  const hostInfo = currentEvent.hostInfo;
  const label = hostInfo.mode === "house"
    ? (hostInfo.currentHost ? nameOf(hostInfo.currentHost) : "A definir")
    : (hostInfo.neutralSpot?.name || "Punto neutro");

  hostNameEl.textContent = label;
  if (hostSummaryEl) hostSummaryEl.textContent = `· ${label}`;

  renderHostHistory();
}

function renderHostHistory() {
  const container = document.getElementById("host-history-list");
  if (!container) return;

  const history = currentEvent.hostInfo.history || [];

  container.innerHTML = history.map(item => {
    const isCurrent = currentEvent.hostInfo.mode === "house" && item.userId === currentEvent.hostInfo.currentHost;
    const timesLabel = item.count === 0 ? "Nunca recibió" : `Recibió ${item.count} ${item.count === 1 ? 'vez' : 'veces'}`;
    return `
      <div class="flex items-center justify-between py-1 px-1.5 text-xs text-slate-600 ${isCurrent ? 'font-semibold text-slate-900' : ''}">
        <span>${escapeHtml(item.name)}</span>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400">${timesLabel}</span>
          ${!isCurrent ? `
            <button onclick="setHostManually(${item.userId})" class="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100">
              Elegir
            </button>
          ` : '<span class="text-[10px] text-slate-500 font-medium">Actual</span>'}
        </div>
      </div>
    `;
  }).join("");
}

function renderChecklist() {
  const container = document.getElementById("tasks-container");
  if (!container) return;

  const assignedCount = currentEvent.tasks.filter(t => t.assignedTo.length > 0).length;
  const tasksSummaryEl = document.getElementById("summary-tasks-badge");
  if (tasksSummaryEl) {
    tasksSummaryEl.textContent = `· ${assignedCount}/${currentEvent.tasks.length} asignadas`;
  }

  container.innerHTML = currentEvent.tasks.map(task => {
    const isFull = task.assignedTo.length >= (task.maxAssignees || 1);
    const userIsAssigned = task.assignedTo.includes(currentUser.id);

    return `
      <div class="flex items-center justify-between p-2.5 rounded-lg border ${task.isPact ? 'bg-slate-50/70 border-slate-300' : 'bg-white border-slate-200'}">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-800">${escapeHtml(task.title)}</span>
          ${task.isPact ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Limpieza</span>' : ''}
        </div>

        <div class="flex items-center gap-1.5 flex-wrap justify-end">
          ${task.assignedTo.map(userId => `
            <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              <span>${escapeHtml(nameOf(userId))}</span>
              ${userId === currentUser.id ? `<button onclick="unclaimTask(${task.id})" title="Quitarme" class="text-slate-400 hover:text-slate-700 ml-0.5 font-bold">×</button>` : ''}
            </span>
          `).join("")}

          ${!isFull && !userIsAssigned ? `
            <button onclick="claimTask(${task.id})" class="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              + Asignarme
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join("");
}

// Opciones del selector "Responsable" de una tarea nueva: los integrantes de la juntada
function renderTaskAssigneeOptions() {
  const select = document.getElementById("new-task-assignee-select");
  if (!select) return;

  const previous = select.value;
  select.innerHTML =
    `<option value="">Responsable: sin asignar</option>` +
    currentEvent.attendees.map(a => `
      <option value="${a.userId}">Responsable: ${escapeHtml(a.name)}${a.userId === currentUser.id ? " (vos)" : ""}</option>
    `).join("");

  if (currentEvent.attendees.some(a => String(a.userId) === previous)) select.value = previous;
}

function renderAttendeesSection() {
  const container = document.getElementById("attendees-list-container");
  const yesList = currentEvent.attendees.filter(a => a.status === "yes");

  const attendeesSummaryEl = document.getElementById("summary-attendees-badge");
  if (attendeesSummaryEl) attendeesSummaryEl.textContent = `· ${yesList.length} confirmados`;

  if (!container) return;

  container.innerHTML = currentEvent.attendees.map(attendee => {
    let statusBadge = "bg-slate-100 text-slate-600";
    let statusText = "Sin confirmar";

    if (attendee.status === "yes") {
      statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
      statusText = "Confirmado";
    } else if (attendee.status === "maybe") {
      statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
      statusText = "En duda";
    } else if (attendee.status === "no") {
      statusBadge = "bg-rose-50 text-rose-700 border-rose-200";
      statusText = "No va";
    }

    return `
      <div class="flex items-center justify-between py-1.5 px-2 text-xs border-b border-slate-100 last:border-0">
        <span class="font-medium text-slate-800">
          ${escapeHtml(attendee.name)}
          ${attendee.isHost ? '<span class="text-[10px] text-slate-400 ml-1 font-normal">(Anfitrión)</span>' : ''}
        </span>
        <span class="text-[10px] px-2 py-0.2 rounded border font-medium ${statusBadge}">
          ${statusText}
        </span>
      </div>
    `;
  }).join("");
}

// ----------------- SECCIÓN DE GASTOS Y CUENTAS -----------------

function renderExpensesSection() {
  const expenses = currentEvent.expenses || [];
  const totalAmountEl = document.getElementById("expenses-total-amount");
  const perPersonEl = document.getElementById("expenses-per-person");
  const listContainer = document.getElementById("expenses-list-container");
  const payerSelect = document.getElementById("expense-payer-select");
  const participantsContainer = document.getElementById("expense-participants-container");
  const settlementContainer = document.getElementById("settlement-container");
  const summaryBadge = document.getElementById("summary-expenses-badge");

  const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const confirmedAttendees = currentEvent.attendees.filter(a => a.status === "yes");
  const baseCount = confirmedAttendees.length > 0 ? confirmedAttendees.length : currentEvent.attendees.length;
  const avgCost = baseCount > 0 ? Math.round(totalAmount / baseCount) : 0;

  if (totalAmountEl) totalAmountEl.textContent = formatCurrency(totalAmount);
  if (perPersonEl) perPersonEl.textContent = baseCount > 0 ? `~${formatCurrency(avgCost)} prom.` : "$0";

  if (summaryBadge) {
    summaryBadge.textContent = totalAmount > 0
      ? `· ${formatCurrency(totalAmount)} (${expenses.length} ${expenses.length === 1 ? 'gasto' : 'gastos'})`
      : "· Sin gastos";
  }

  // Selector de quién pagó
  if (payerSelect) {
    const currentSelected = payerSelect.value || String(currentUser.id);
    payerSelect.innerHTML = currentEvent.attendees.map(a => `
      <option value="${a.userId}" ${String(a.userId) === currentSelected ? 'selected' : ''}>
        Pagó: ${escapeHtml(a.name)}
      </option>
    `).join("");
  }

  // Checkboxes de integrantes para el nuevo gasto
  if (participantsContainer) {
    participantsContainer.innerHTML = currentEvent.attendees.map(a => `
      <label class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 text-xs cursor-pointer hover:bg-slate-50 transition-colors">
        <input type="checkbox" name="expense-participant" value="${a.userId}" checked class="rounded text-slate-900 accent-slate-900">
        <span class="text-slate-800">${escapeHtml(a.name)}</span>
      </label>
    `).join("");
  }

  // Lista de gastos
  if (listContainer) {
    if (expenses.length === 0) {
      listContainer.innerHTML = `<div class="text-[11px] text-slate-400 italic py-1">No hay gastos registrados aún.</div>`;
    } else {
      listContainer.innerHTML = expenses.map(exp => {
        const parts = exp.participants || [];
        const isAll = parts.length >= currentEvent.attendees.length;
        const participantsLabel = isAll ? "Todos los integrantes" : parts.map(nameOf).join(", ");
        const canDelete = [exp.createdById, exp.payer, currentEvent.organizerId].includes(currentUser.id);

        return `
          <div class="p-2 rounded border border-slate-200 bg-white text-xs space-y-1">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-semibold text-slate-900">${escapeHtml(exp.desc)}</span>
                <span class="text-slate-500 ml-1">· Pagó <strong>${escapeHtml(nameOf(exp.payer))}</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900">${formatCurrency(exp.amount)}</span>
                ${canDelete ? `
                  <button onclick="deleteExpense(${exp.id})" title="Eliminar gasto" class="text-slate-400 hover:text-rose-600 font-bold px-1 text-sm">
                    ×
                  </button>
                ` : ''}
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-1">
              <span class="text-slate-400">Participan (${parts.length}):</span>
              <span class="text-slate-700 truncate max-w-[340px]">${escapeHtml(participantsLabel)}</span>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  // Liquidación de transferencias
  if (settlementContainer) {
    if (totalAmount === 0) {
      settlementContainer.innerHTML = `<div class="text-[11px] text-slate-400 italic">Cargá gastos para calcular quién le debe a quién.</div>`;
      return;
    }

    const settlements = calculateSettlements(expenses, currentEvent.attendees);

    if (settlements.length === 0) {
      settlementContainer.innerHTML = `<div class="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded border border-emerald-200">¡Cuentas saldadas! Nadie se debe nada.</div>`;
    } else {
      settlementContainer.innerHTML = settlements.map(s => `
        <div class="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200 text-xs">
          <div class="text-slate-700">
            <strong>${escapeHtml(nameOf(s.from))}</strong> le transfiere a <strong>${escapeHtml(nameOf(s.to))}</strong>
          </div>
          <span class="font-bold text-slate-900">${formatCurrency(s.amount)}</span>
        </div>
      `).join("");
    }
  }
}

// Liquidación con participantes específicos por gasto; minimiza transferencias (greedy).
// Devuelve [{ from: userId, to: userId, amount }]
function calculateSettlements(expenses, attendees) {
  if (!expenses || expenses.length === 0) return [];

  const paidMap = {};
  const owedMap = {};

  attendees.forEach(a => {
    paidMap[a.userId] = 0;
    owedMap[a.userId] = 0;
  });

  expenses.forEach(exp => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) return;

    paidMap[exp.payer] = (paidMap[exp.payer] || 0) + amount;

    let parts = exp.participants;
    if (!parts || parts.length === 0) parts = attendees.map(a => a.userId);

    const sharePerPerson = amount / parts.length;
    parts.forEach(userId => {
      owedMap[userId] = (owedMap[userId] || 0) + sharePerPerson;
    });
  });

  const allPeople = Array.from(new Set([...Object.keys(paidMap), ...Object.keys(owedMap)]));
  const debtors = [];
  const creditors = [];

  allPeople.forEach(key => {
    const net = (paidMap[key] || 0) - (owedMap[key] || 0);
    const userId = Number(key);
    if (net < -0.9) debtors.push({ userId, owes: Math.abs(net) });
    else if (net > 0.9) creditors.push({ userId, receives: net });
  });

  const settlements = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(debtor.owes, creditor.receives);

    if (amount >= 1) {
      settlements.push({ from: debtor.userId, to: creditor.userId, amount: Math.round(amount) });
    }

    debtor.owes -= amount;
    creditor.receives -= amount;

    if (debtor.owes < 1) d++;
    if (creditor.receives < 1) c++;
  }

  return settlements;
}

function selectAllExpenseParticipants(checkAll) {
  document.querySelectorAll('input[name="expense-participant"]').forEach(cb => { cb.checked = checkAll; });
}

async function addExpenseFromForm() {
  const descInput = document.getElementById("expense-desc-input");
  const amountInput = document.getElementById("expense-amount-input");
  const payerSelect = document.getElementById("expense-payer-select");

  const description = descInput?.value.trim();
  const amount = Number(amountInput?.value);
  const payerId = Number(payerSelect?.value);
  const participantIds = Array.from(document.querySelectorAll('input[name="expense-participant"]:checked'))
    .map(cb => Number(cb.value));

  if (!description) {
    alert("Ingresá el concepto del gasto (ej: Bebidas)");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Ingresá un monto válido");
    return;
  }
  if (participantIds.length === 0) {
    alert("Tenés que seleccionar al menos un integrante que participe de este gasto");
    return;
  }

  const ok = await eventAction("POST", "/expenses", { description, amount, payerId, participantIds });
  if (ok) {
    descInput.value = "";
    amountInput.value = "";
  }
}

function deleteExpense(expenseId) {
  eventAction("DELETE", `/expenses/${expenseId}`);
}

// ----------------- ACCIONES -----------------

function submitRSVP(status) {
  eventAction("PUT", "/rsvp", { status });
}

function toggleDateVote(dateId) {
  eventAction("POST", `/dates/${dateId}/vote`);
}

// Agrega una opción de fecha nueva; queda votada por quien la propone
async function proposeNewDate() {
  const daySelect = document.getElementById("new-date-day-select");
  const timeInput = document.getElementById("new-date-time-input");
  const day = daySelect?.value;
  const time = timeInput?.value;

  if (!day || !time) {
    alert("Elegí un día y un horario para proponer");
    return;
  }

  const ok = await eventAction("POST", "/dates", { day, time });
  if (ok) {
    daySelect.value = "";
    timeInput.value = "";
  }
}

function claimTask(taskId) {
  eventAction("POST", `/tasks/${taskId}/assignees`);
}

function unclaimTask(taskId) {
  eventAction("DELETE", `/tasks/${taskId}/assignees`);
}

async function addNewCustomTask() {
  const input = document.getElementById("new-task-input");
  const assigneeSelect = document.getElementById("new-task-assignee-select");
  const title = input?.value.trim();
  if (!title) {
    alert("Escribí la tarea primero (ej: Comprar hielo y carbón)");
    return;
  }

  const assigneeId = assigneeSelect?.value ? Number(assigneeSelect.value) : null;
  const ok = await eventAction("POST", "/tasks", { title, assigneeId });
  if (ok) {
    input.value = "";
    if (assigneeSelect) assigneeSelect.value = "";
  }
}

function spinHostRoulette() {
  eventAction("PUT", "/host", { action: "rotate" });
}

function setHostManually(userId) {
  eventAction("PUT", "/host", { action: "set", userId });
}

function cederTurno() {
  eventAction("PUT", "/host", { action: "cede" });
}

function setNeutralMode(spot) {
  eventAction("PUT", "/host", { action: "neutral", spot });
}

async function deleteCurrentEvent() {
  if (!currentEvent) return;
  if (!confirm(`¿Eliminar la juntada "${currentEvent.title}"? No se puede deshacer.`)) return;

  try {
    await api.del(`/events/${currentEvent.id}`);
    showListView();
  } catch (err) {
    handleApiError(err);
  }
}

// ----------------- COMPARTIR -----------------

function eventShareUrl() {
  return window.location.href.split("#")[0] + "#event=" + currentEvent.id;
}

function buildWhatsAppMessage() {
  const confirmed = currentEvent.attendees.filter(a => a.status === "yes").map(a => a.name);

  // Fecha más votada
  let winnerDate = "A coordinar";
  let maxVotes = -1;
  currentEvent.dates.forEach(d => {
    if (d.votes.length > maxVotes) {
      maxVotes = d.votes.length;
      winnerDate = d.label;
    }
  });

  const hostText = currentEvent.hostInfo.mode === "house"
    ? `Sede: ${currentEvent.hostInfo.currentHost ? nameOf(currentEvent.hostInfo.currentHost) : 'A definir'}`
    : `Sede: ${currentEvent.hostInfo.neutralSpot?.name || 'Punto intermedio'}`;

  let expensesText = "";
  if (currentEvent.expenses.length > 0) {
    const totalAmount = currentEvent.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const settlements = calculateSettlements(currentEvent.expenses, currentEvent.attendees);

    expensesText = `\n💰 *Cuentas (Total: ${formatCurrency(totalAmount)}):*\n`;
    currentEvent.expenses.forEach(e => {
      expensesText += `  • ${e.desc} (${formatCurrency(e.amount)} - ${nameOf(e.payer)}): entre ${e.participants.length} personas\n`;
    });
    if (settlements.length > 0) {
      expensesText += `*Transferencias para saldar:*\n`;
      expensesText += settlements.map(s => `  • ${nameOf(s.from)} le pasa ${formatCurrency(s.amount)} a ${nameOf(s.to)}`).join("\n") + "\n";
    }
  }

  return `*${currentEvent.title}*\n` +
         `Fecha: ${winnerDate}\n` +
         `${hostText}\n` +
         `Confirmados (${confirmed.length}): ${confirmed.join(", ") || 'Ninguno'}\n` +
         expensesText +
         `\nConfirmar o ver detalles en: ${eventShareUrl()}`;
}

function shareOnWhatsApp() {
  const text = buildWhatsAppMessage();
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
}

function copyShareLink() {
  navigator.clipboard.writeText(eventShareUrl()).then(() => {
    alert("Enlace copiado");
  });
}

// ----------------- PLAZO PARA CONFIRMAR -----------------

function updateCountdown() {
  const timerEl = document.getElementById("deadline-countdown");
  if (!timerEl || !currentEvent?.deadline) return;

  const diff = new Date(currentEvent.deadline) - new Date();
  if (diff <= 0) {
    timerEl.textContent = "Plazo para confirmar cerrado";
    return;
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  timerEl.textContent = `${hours}h ${mins}m para confirmar`;
}

function initCountdown() {
  setInterval(updateCountdown, 60000);
}

// ----------------- MODALES -----------------

function openDesignThinkingModal() {
  document.getElementById("dt-info-modal")?.classList.remove("hidden");
  document.getElementById("dt-info-modal")?.classList.add("flex");
}

function closeDesignThinkingModal() {
  document.getElementById("dt-info-modal")?.classList.add("hidden");
  document.getElementById("dt-info-modal")?.classList.remove("flex");
}

function openNewEventModal() {
  document.getElementById("new-event-modal")?.classList.remove("hidden");
  document.getElementById("new-event-modal")?.classList.add("flex");
}

function closeNewEventModal() {
  document.getElementById("new-event-modal")?.classList.add("hidden");
  document.getElementById("new-event-modal")?.classList.remove("flex");
}

async function createNewEventFromForm() {
  const title = document.getElementById("new-title-input")?.value.trim();
  const d1 = document.getElementById("new-d1-input")?.value.trim();
  const d2 = document.getElementById("new-d2-input")?.value.trim();
  const hours = Number(document.getElementById("new-hours-input")?.value || 6);

  if (!title) {
    alert("Ponele un título a la juntada");
    return;
  }

  try {
    const event = await api.post("/events", { title, dates: [d1, d2], hours });
    closeNewEventModal();
    openEventDetail(event.id);
  } catch (err) {
    handleApiError(err);
  }
}
