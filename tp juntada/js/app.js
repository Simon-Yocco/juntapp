/**
 * Coordinador de Juntadas - Soporte multi-evento y vista principal
 */

const STORAGE_KEY_EVENTS = "juntapp_multi_events_v1";

// Eventos precargados por defecto (caso de prueba)
const DEFAULT_EVENTS = [
  {
    id: "juntada-1",
    title: "Juntada de Fin de Semana",
    organizer: "Salvador Tosar",
    deadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    dates: [
      { id: "d1", label: "Viernes 21:30 hs", votes: ["Simon Yocco", "Mateo Bertin"] },
      { id: "d2", label: "Sábado 22:00 hs", votes: ["Salvador Tosar", "Lucas Martino", "Mateo Bertin", "Pedro Ravanelli", "Simon Yocco"] },
      { id: "d3", label: "Domingo 13:00 hs", votes: ["Robertino Joffre"] }
    ],
    hostInfo: {
      mode: "house",
      currentHost: "Lucas Martino",
      neutralSpot: null,
      history: [
        { name: "Lucas Martino", count: 1, lastDate: "Hace 2 meses", nextDue: true },
        { name: "Simon Yocco", count: 2, lastDate: "Hace 15 días" },
        { name: "Mateo Bertin", count: 2, lastDate: "Hace 3 semanas" },
        { name: "Salvador Tosar", count: 3, lastDate: "Hace 1 mes" },
        { name: "Pedro Ravanelli", count: 1, lastDate: "Hace 3 meses" }
      ]
    },
    attendees: [
      { name: "Salvador Tosar", status: "yes" },
      { name: "Lucas Martino", status: "yes", isHost: true },
      { name: "Mateo Bertin", status: "yes" },
      { name: "Simon Yocco", status: "yes" },
      { name: "Pedro Ravanelli", status: "maybe" },
      { name: "Robertino Joffre", status: "maybe" }
    ],
    tasks: [
      { id: "t-clean", title: "Limpieza final", assignedTo: ["Mateo Bertin", "Pedro Ravanelli"], maxAssignees: 3, isPact: true },
      { id: "t-ice", title: "Hielo y vasos", assignedTo: ["Salvador Tosar"], maxAssignees: 1 },
      { id: "t-drinks", title: "Gaseosas", assignedTo: [], maxAssignees: 2 },
      { id: "t-alcohol", title: "Bebidas", assignedTo: ["Simon Yocco"], maxAssignees: 3 },
      { id: "t-food", title: "Snacks y comida", assignedTo: [], maxAssignees: 2 },
      { id: "t-music", title: "Música / Parlante", assignedTo: ["Robertino Joffre"], maxAssignees: 1 }
    ],
    expenses: [
      { id: "e1", desc: "Bebidas", amount: 24000, payer: "Simon Yocco", participants: ["Simon Yocco", "Salvador Tosar", "Mateo Bertin"] },
      { id: "e2", desc: "Hielo y vasos", amount: 6000, payer: "Salvador Tosar", participants: ["Salvador Tosar", "Lucas Martino", "Mateo Bertin", "Simon Yocco"] }
    ]
  },
  {
    id: "juntada-2",
    title: "Asado de Fin de Mes",
    organizer: "Mateo Bertin",
    deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    dates: [
      { id: "d1", label: "Domingo 13:00 hs", votes: ["Mateo Bertin", "Simon Yocco", "Salvador Tosar"] },
      { id: "d2", label: "Sábado 21:30 hs", votes: ["Lucas Martino"] }
    ],
    hostInfo: {
      mode: "house",
      currentHost: "Simon Yocco",
      neutralSpot: null,
      history: [
        { name: "Simon Yocco", count: 1, lastDate: "Hace 1 mes" },
        { name: "Mateo Bertin", count: 2, lastDate: "Hace 2 meses" }
      ]
    },
    attendees: [
      { name: "Mateo Bertin", status: "yes" },
      { name: "Simon Yocco", status: "yes", isHost: true },
      { name: "Salvador Tosar", status: "yes" },
      { name: "Lucas Martino", status: "maybe" }
    ],
    tasks: [
      { id: "t-carne", title: "Carne y carbón", assignedTo: ["Mateo Bertin"], maxAssignees: 2 },
      { id: "t-clean", title: "Limpieza y parrilla", assignedTo: ["Salvador Tosar"], maxAssignees: 2, isPact: true },
      { id: "t-drinks", title: "Bebidas", assignedTo: ["Simon Yocco"], maxAssignees: 3 }
    ],
    expenses: [
      { id: "e1", desc: "Carne y carbón", amount: 45000, payer: "Mateo Bertin", participants: ["Mateo Bertin", "Simon Yocco", "Salvador Tosar"] }
    ]
  }
];

let allEvents = [];
let currentEvent = null;
let currentUser = {
  name: localStorage.getItem("juntapp_user_name") || "",
  status: null
};

document.addEventListener("DOMContentLoaded", () => {
  loadAllEvents();
  setupRouting();
  initCountdown();
  setupSectionNavObserver();
});

// Carga de eventos desde LocalStorage
function loadAllEvents() {
  const saved = localStorage.getItem(STORAGE_KEY_EVENTS);
  if (saved) {
    try {
      allEvents = JSON.parse(saved);
    } catch (e) {
      console.warn(e);
      allEvents = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
    }
  } else {
    allEvents = JSON.parse(JSON.stringify(DEFAULT_EVENTS));
    saveAllEvents();
  }
}

function saveAllEvents() {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allEvents));
}

function syncCurrentEvent() {
  if (!currentEvent) return;
  const idx = allEvents.findIndex(e => e.id === currentEvent.id);
  if (idx >= 0) {
    allEvents[idx] = currentEvent;
  } else {
    allEvents.push(currentEvent);
  }
  saveAllEvents();
}

// Enrutamiento simple por hash
function setupRouting() {
  window.addEventListener("hashchange", handleHash);
  handleHash();
}

function handleHash() {
  const hash = window.location.hash.substring(1);

  if (hash.startsWith("data=")) {
    try {
      const jsonStr = decodeURIComponent(atob(hash.replace("data=", "")));
      const imported = JSON.parse(jsonStr);
      // Guardar en la lista si no existe
      const existing = allEvents.find(e => e.id === imported.id);
      if (!existing) {
        allEvents.unshift(imported);
        saveAllEvents();
      }
      openEventDetail(imported.id, false);
      return;
    } catch (e) {
      console.warn("Error importando datos:", e);
    }
  }

  if (hash.startsWith("event=")) {
    const id = hash.replace("event=", "");
    const found = allEvents.find(e => e.id === id);
    if (found) {
      openEventDetail(id, false);
      return;
    }
  }

  showListView(false);
}

// Vistas
function showListView(updateHash = true) {
  if (updateHash) {
    history.replaceState(null, "", window.location.pathname);
  }

  document.getElementById("view-events-list")?.classList.remove("hidden");
  document.getElementById("view-event-detail")?.classList.add("hidden");

  renderEventsList();
  if (window.lucide) lucide.createIcons();
}

function openEventDetail(eventId, updateHash = true) {
  const found = allEvents.find(e => e.id === eventId);
  if (!found) return;

  currentEvent = found;
  if (updateHash) {
    history.replaceState(null, "", `#event=${eventId}`);
  }

  document.getElementById("view-events-list")?.classList.add("hidden");
  document.getElementById("view-event-detail")?.classList.remove("hidden");

  renderApp();
  positionSectionNav();
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (window.lucide) lucide.createIcons();
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

function deleteCurrentEvent() {
  if (!currentEvent) return;
  if (!confirm(`¿Eliminar la juntada "${currentEvent.title}"?`)) return;

  allEvents = allEvents.filter(e => e.id !== currentEvent.id);
  saveAllEvents();
  showListView();
}

// Renderizado de lista principal de eventos
function renderEventsList() {
  const container = document.getElementById("events-list-container");
  if (!container) return;

  if (allEvents.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 clean-card p-6">
        <p class="text-xs text-slate-500 mb-3">No tenés juntadas creadas todavía.</p>
        <button onclick="openNewEventModal()" class="text-xs px-3.5 py-1.5 rounded-md bg-slate-900 text-white font-medium">
          + Crear la primera juntada
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = allEvents.map(event => {
    const confirmedCount = event.attendees.filter(a => a.status === "yes").length;
    
    // Buscar fecha con más votos
    let winnerDate = event.dates[0]?.label || "A coordinar";
    let maxV = -1;
    event.dates.forEach(d => {
      if (d.votes.length > maxV) {
        maxV = d.votes.length;
        winnerDate = d.label;
      }
    });

    const hostName = event.hostInfo.mode === "house" 
      ? (event.hostInfo.currentHost || "A definir")
      : (event.hostInfo.neutralSpot?.name || "Punto neutro");

    return `
      <div onclick="openEventDetail('${event.id}')" 
           class="clean-card p-4 hover:border-slate-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-slate-900">${event.title}</h3>
            <span class="text-[10px] text-slate-400">por ${event.organizer}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
            <span class="flex items-center gap-1">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${winnerDate}</span>
            </span>
            <span>·</span>
            <span class="flex items-center gap-1">
              <i data-lucide="home" class="w-3.5 h-3.5 text-slate-400"></i>
              <span>${hostName}</span>
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            ${confirmedCount} confirmados
          </span>
          <span class="text-xs text-slate-700 font-medium flex items-center gap-0.5">
            <span>Abrir</span>
            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Renderizado del detalle del evento activo
function renderApp() {
  if (!currentEvent) return;

  if (!currentEvent.expenses) {
    currentEvent.expenses = [];
  }

  renderHeader();
  renderDateVoting();
  renderHostSection();
  renderChecklist();
  renderTaskAssigneeOptions();
  renderAttendeesSection();
  renderExpensesSection();

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderHeader() {
  const titleEl = document.getElementById("event-title");
  if (titleEl) titleEl.textContent = currentEvent.title;

  const currentUserNameInput = document.getElementById("current-user-input");
  if (currentUserNameInput && !currentUserNameInput.value && currentUser.name) {
    currentUserNameInput.value = currentUser.name;
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
  if (summaryBadge && leaderLabel) {
    summaryBadge.textContent = `· Preferida: ${leaderLabel}`;
  }

  const totalVotes = currentEvent.dates.reduce((acc, d) => acc + d.votes.length, 0);

  container.innerHTML = currentEvent.dates.map(date => {
    const isLeader = date.id === leaderId && maxVotes > 0;
    const voteCount = date.votes.length;
    const userVoted = currentUser.name && date.votes.includes(currentUser.name);

    return `
      <div class="flex items-center justify-between p-2.5 rounded-lg border ${userVoted ? 'bg-slate-50 border-slate-400' : 'bg-white border-slate-200'}">
        <div class="flex items-center gap-2">
          <span class="text-xs font-semibold text-slate-900">${date.label}</span>
          ${isLeader ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">Más votada</span>' : ''}
          <span class="text-[11px] text-slate-400 font-medium">(${voteCount})</span>
          ${date.proposedBy ? `<span class="text-[10px] text-slate-400">· propuesta por ${date.proposedBy}</span>` : ''}
        </div>

        <div class="flex items-center gap-2">
          <button onclick="toggleDateVote('${date.id}')" 
                  class="text-xs px-2.5 py-1 rounded border transition-colors ${userVoted ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}">
            ${userVoted ? 'Votado' : 'Votar'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderHostSection() {
  const hostNameEl = document.getElementById("current-host-name");
  const hostSummaryEl = document.getElementById("summary-host-badge");
  if (!hostNameEl) return;

  const hostInfo = currentEvent.hostInfo;

  if (hostInfo.mode === "house") {
    const name = hostInfo.currentHost || "A definir";
    hostNameEl.textContent = name;
    if (hostSummaryEl) hostSummaryEl.textContent = `· ${name}`;
  } else {
    const spot = hostInfo.neutralSpot?.name || "Punto neutro";
    hostNameEl.textContent = spot;
    if (hostSummaryEl) hostSummaryEl.textContent = `· ${spot}`;
  }

  renderHostHistory();
}

function renderHostHistory() {
  const container = document.getElementById("host-history-list");
  if (!container) return;

  const history = currentEvent.hostInfo.history || [];

  container.innerHTML = history.slice(0, 4).map(item => {
    const isCurrent = item.name === currentEvent.hostInfo.currentHost;
    return `
      <div class="flex items-center justify-between py-1 px-1.5 text-xs text-slate-600 ${isCurrent ? 'font-semibold text-slate-900' : ''}">
        <span>${item.name}</span>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-slate-400">${item.lastDate}</span>
          ${!isCurrent ? `
            <button onclick="setHostManually('${item.name}')" class="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100">
              Elegir
            </button>
          ` : '<span class="text-[10px] text-slate-500 font-medium">Actual</span>'}
        </div>
      </div>
    `;
  }).join('');
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
    const isAssigned = task.assignedTo.length > 0;
    const isFull = task.assignedTo.length >= (task.maxAssignees || 1);
    const userIsAssigned = currentUser.name && task.assignedTo.includes(currentUser.name);

    return `
      <div class="flex items-center justify-between p-2.5 rounded-lg border ${task.isPact ? 'bg-slate-50/70 border-slate-300' : 'bg-white border-slate-200'}">
        <div class="flex items-center gap-2">
          <span class="text-xs font-medium text-slate-800">${task.title}</span>
          ${task.isPact ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">Limpieza</span>' : ''}
        </div>

        <div class="flex items-center gap-1.5 flex-wrap justify-end">
          ${task.assignedTo.map(person => `
            <span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              <span>${person}</span>
              ${person === currentUser.name ? `<button onclick="unclaimTask('${task.id}')" title="Quitarme" class="text-slate-400 hover:text-slate-700 ml-0.5 font-bold">×</button>` : ''}
            </span>
          `).join('')}

          ${!isFull && !userIsAssigned ? `
            <button onclick="claimTask('${task.id}')" class="text-[11px] px-2 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium">
              + Asignarme
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderAttendeesSection() {
  const container = document.getElementById("attendees-list-container");
  const countYesEl = document.getElementById("count-yes");
  const countMaybeEl = document.getElementById("count-maybe");

  const yesList = currentEvent.attendees.filter(a => a.status === "yes");
  const maybeList = currentEvent.attendees.filter(a => a.status === "maybe");

  if (countYesEl) countYesEl.textContent = yesList.length;
  if (countMaybeEl) countMaybeEl.textContent = maybeList.length;

  const attendeesSummaryEl = document.getElementById("summary-attendees-badge");
  if (attendeesSummaryEl) {
    attendeesSummaryEl.textContent = `· ${yesList.length} confirmados`;
  }

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
          ${attendee.name}
          ${attendee.isHost ? '<span class="text-[10px] text-slate-400 ml-1 font-normal">(Anfitrión)</span>' : ''}
        </span>
        <span class="text-[10px] px-2 py-0.2 rounded border font-medium ${statusBadge}">
          ${statusText}
        </span>
      </div>
    `;
  }).join('');
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

  // Actualizar selector de quién pagó
  if (payerSelect) {
    const currentSelected = payerSelect.value;
    const allNames = currentEvent.attendees.map(a => a.name);
    if (currentUser.name && !allNames.includes(currentUser.name)) {
      allNames.unshift(currentUser.name);
    }

    payerSelect.innerHTML = allNames.map(name => `
      <option value="${name}" ${name === (currentSelected || currentUser.name) ? 'selected' : ''}>
        Pagó: ${name}
      </option>
    `).join('');
  }

  // Renderizar checkboxes de integrantes para el nuevo gasto
  if (participantsContainer) {
    const allAttendees = currentEvent.attendees.map(a => a.name);
    participantsContainer.innerHTML = allAttendees.map(name => {
      return `
        <label class="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-slate-200 text-xs cursor-pointer hover:bg-slate-50 transition-colors">
          <input type="checkbox" name="expense-participant" value="${name}" checked class="rounded text-slate-900 accent-slate-900">
          <span class="text-slate-800">${name}</span>
        </label>
      `;
    }).join('');
  }

  // Renderizar lista de gastos
  if (listContainer) {
    if (expenses.length === 0) {
      listContainer.innerHTML = `<div class="text-[11px] text-slate-400 italic py-1">No hay gastos registrados aún.</div>`;
    } else {
      listContainer.innerHTML = expenses.map(exp => {
        const parts = exp.participants || [];
        const isAll = parts.length >= currentEvent.attendees.length;
        const participantsLabel = isAll 
          ? "Todos los integrantes" 
          : parts.join(", ");

        return `
          <div class="p-2 rounded border border-slate-200 bg-white text-xs space-y-1">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-semibold text-slate-900">${exp.desc}</span>
                <span class="text-slate-500 ml-1">· Pagó <strong>${exp.payer}</strong></span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-900">${formatCurrency(exp.amount)}</span>
                <button onclick="deleteExpense('${exp.id}')" title="Eliminar gasto" class="text-slate-400 hover:text-rose-600 font-bold px-1 text-sm">
                  ×
                </button>
              </div>
            </div>
            <div class="text-[11px] text-slate-500 flex items-center gap-1">
              <span class="text-slate-400">Participan (${parts.length}):</span>
              <span class="text-slate-700 truncate max-w-[340px]">${participantsLabel}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Calcular y renderizar liquidación exacta de transferencias
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
            <strong>${s.from}</strong> le transfiere a <strong>${s.to}</strong>
          </div>
          <span class="font-bold text-slate-900">${formatCurrency(s.amount)}</span>
        </div>
      `).join('');
    }
  }
}

// Algoritmo de liquidación con participantes específicos por gasto
function calculateSettlements(expenses, attendees) {
  if (!expenses || expenses.length === 0) return [];

  const paidMap = {};
  const owedMap = {};

  // Inicializar a todos los asistentes
  attendees.forEach(a => {
    paidMap[a.name] = 0;
    owedMap[a.name] = 0;
  });

  // Procesar cada gasto individualmente
  expenses.forEach(exp => {
    const amount = Number(exp.amount) || 0;
    if (amount <= 0) return;

    // Quien pagó
    paidMap[exp.payer] = (paidMap[exp.payer] || 0) + amount;

    // Participantes de este gasto específico
    let parts = exp.participants;
    if (!parts || parts.length === 0) {
      parts = attendees.map(a => a.name);
    }

    const sharePerPerson = amount / parts.length;
    parts.forEach(name => {
      owedMap[name] = (owedMap[name] || 0) + sharePerPerson;
    });
  });

  // Calcular balance neto: pagado - debido
  const allPeople = Array.from(new Set([...Object.keys(paidMap), ...Object.keys(owedMap)]));
  const debtors = [];
  const creditors = [];

  allPeople.forEach(name => {
    const paid = paidMap[name] || 0;
    const owed = owedMap[name] || 0;
    const net = paid - owed;

    if (net < -0.9) {
      debtors.push({ name, owes: Math.abs(net) });
    } else if (net > 0.9) {
      creditors.push({ name, receives: net });
    }
  });

  // Parear deudores y acreedores (algoritmo greedy óptimo)
  const settlements = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amount = Math.min(debtor.owes, creditor.receives);

    if (amount >= 1) {
      settlements.push({
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(amount)
      });
    }

    debtor.owes -= amount;
    creditor.receives -= amount;

    if (debtor.owes < 1) d++;
    if (creditor.receives < 1) c++;
  }

  return settlements;
}

function selectAllExpenseParticipants(checkAll) {
  const checkboxes = document.querySelectorAll('input[name="expense-participant"]');
  checkboxes.forEach(cb => { cb.checked = checkAll; });
}

function addExpenseFromForm() {
  const descInput = document.getElementById("expense-desc-input");
  const amountInput = document.getElementById("expense-amount-input");
  const payerSelect = document.getElementById("expense-payer-select");

  const desc = descInput?.value.trim();
  const amount = Number(amountInput?.value);
  const payer = payerSelect?.value;

  if (!desc) {
    alert("Ingresá el concepto del gasto (ej: Bebidas)");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Ingresá un monto válido");
    return;
  }
  if (!payer) {
    alert("Seleccioná quién pagó");
    return;
  }

  // Obtener integrantes seleccionados para este gasto
  const selectedCheckboxes = document.querySelectorAll('input[name="expense-participant"]:checked');
  const selectedParticipants = Array.from(selectedCheckboxes).map(cb => cb.value);

  if (selectedParticipants.length === 0) {
    alert("Tenés que seleccionar al menos un integrante que participe de este gasto");
    return;
  }

  if (!currentEvent.expenses) {
    currentEvent.expenses = [];
  }

  currentEvent.expenses.push({
    id: "exp-" + Date.now(),
    desc: desc,
    amount: amount,
    payer: payer,
    participants: selectedParticipants
  });

  if (descInput) descInput.value = "";
  if (amountInput) amountInput.value = "";

  syncCurrentEvent();
  renderApp();
}

function deleteExpense(expenseId) {
  if (!currentEvent.expenses) return;
  currentEvent.expenses = currentEvent.expenses.filter(e => e.id !== expenseId);
  syncCurrentEvent();
  renderApp();
}

function formatCurrency(amount) {
  return "$" + Number(amount || 0).toLocaleString("es-AR");
}

function setUserNameFromInput() {
  const input = document.getElementById("current-user-input");
  if (!input || !input.value.trim()) {
    alert("Ingresá tu nombre primero");
    return false;
  }
  currentUser.name = input.value.trim();
  localStorage.setItem("juntapp_user_name", currentUser.name);
  return true;
}

function submitRSVP(status) {
  if (!setUserNameFromInput()) return;

  const existingIdx = currentEvent.attendees.findIndex(a => a.name.toLowerCase() === currentUser.name.toLowerCase());
  const attendeeData = {
    name: currentUser.name,
    status: status,
    isHost: currentEvent.hostInfo.currentHost?.toLowerCase() === currentUser.name.toLowerCase()
  };

  if (existingIdx >= 0) {
    currentEvent.attendees[existingIdx] = { ...currentEvent.attendees[existingIdx], ...attendeeData };
  } else {
    currentEvent.attendees.push(attendeeData);
  }

  syncCurrentEvent();
  renderApp();
}

function toggleDateVote(dateId) {
  if (!setUserNameFromInput()) return;

  const dateObj = currentEvent.dates.find(d => d.id === dateId);
  if (!dateObj) return;

  const idx = dateObj.votes.indexOf(currentUser.name);
  if (idx >= 0) {
    dateObj.votes.splice(idx, 1);
  } else {
    dateObj.votes.push(currentUser.name);
  }

  syncCurrentEvent();
  renderApp();
}

// Agrega una opción de fecha nueva y la vota automáticamente quien la propone
function proposeNewDate() {
  const daySelect = document.getElementById("new-date-day-select");
  const timeInput = document.getElementById("new-date-time-input");
  const day = daySelect?.value;
  const time = timeInput?.value;

  if (!day || !time) {
    alert("Elegí un día y un horario para proponer");
    return;
  }
  if (!setUserNameFromInput()) return;

  const label = `${day} ${time} hs`;
  const existing = currentEvent.dates.find(d => d.label.toLowerCase() === label.toLowerCase());
  if (existing) {
    if (!existing.votes.includes(currentUser.name)) existing.votes.push(currentUser.name);
  } else {
    currentEvent.dates.push({
      id: "d-" + Date.now(),
      label: label,
      votes: [currentUser.name],
      proposedBy: currentUser.name
    });
  }

  daySelect.value = "";
  timeInput.value = "";
  syncCurrentEvent();
  renderApp();
}

function claimTask(taskId) {
  if (!setUserNameFromInput()) return;

  const task = currentEvent.tasks.find(t => t.id === taskId);
  if (!task || task.assignedTo.includes(currentUser.name)) return;

  task.assignedTo.push(currentUser.name);
  syncCurrentEvent();
  renderApp();
}

function unclaimTask(taskId) {
  if (!currentUser.name) return;

  const task = currentEvent.tasks.find(t => t.id === taskId);
  if (!task) return;

  const idx = task.assignedTo.indexOf(currentUser.name);
  if (idx >= 0) {
    task.assignedTo.splice(idx, 1);
    syncCurrentEvent();
    renderApp();
  }
}

// Opciones del selector "Responsable" de una tarea nueva: los integrantes de la juntada
function renderTaskAssigneeOptions() {
  const select = document.getElementById("new-task-assignee-select");
  if (!select) return;

  const previous = select.value;
  const names = currentEvent.attendees.map(a => a.name);
  if (currentUser.name && !names.includes(currentUser.name)) names.unshift(currentUser.name);

  select.innerHTML =
    `<option value="">Responsable: sin asignar</option>` +
    names.map(name => `
      <option value="${name}">Responsable: ${name}${name === currentUser.name ? " (vos)" : ""}</option>
    `).join('');

  if (names.includes(previous)) select.value = previous;
}

function addNewCustomTask() {
  const input = document.getElementById("new-task-input");
  const assigneeSelect = document.getElementById("new-task-assignee-select");
  if (!input || !input.value.trim()) {
    alert("Escribí la tarea primero (ej: Comprar hielo y carbón)");
    return;
  }

  const assignee = assigneeSelect?.value;

  currentEvent.tasks.push({
    id: "task-" + Date.now(),
    title: input.value.trim(),
    assignedTo: assignee ? [assignee] : [],
    maxAssignees: 1
  });

  input.value = "";
  if (assigneeSelect) assigneeSelect.value = "";
  syncCurrentEvent();
  renderApp();
}

function spinHostRoulette() {
  const candidates = currentEvent.hostInfo.history.filter(h => !h.exemptReason);
  if (candidates.length === 0) return;

  candidates.sort((a, b) => a.count - b.count);
  const chosen = candidates[0];

  setHostManually(chosen.name);
}

function setHostManually(hostName) {
  currentEvent.hostInfo.mode = "house";
  currentEvent.hostInfo.currentHost = hostName;
  currentEvent.attendees.forEach(a => {
    a.isHost = a.name.toLowerCase() === hostName.toLowerCase();
  });
  syncCurrentEvent();
  renderApp();
}

function cederTurno() {
  const current = currentEvent.hostInfo.currentHost;
  const history = currentEvent.hostInfo.history.filter(h => h.name !== current && !h.exemptReason);
  if (history.length > 0) {
    setHostManually(history[0].name);
  }
}

function setNeutralMode(name) {
  currentEvent.hostInfo.mode = "neutral";
  currentEvent.hostInfo.neutralSpot = { name };
  currentEvent.attendees.forEach(a => a.isHost = false);
  syncCurrentEvent();
  renderApp();
}

function buildWhatsAppMessage() {
  const confirmed = currentEvent.attendees.filter(a => a.status === "yes").map(a => a.name);
  let winnerDate = currentEvent.dates[0]?.label || "A coordinar";

  const hostText = currentEvent.hostInfo.mode === "house" 
    ? `Sede: ${currentEvent.hostInfo.currentHost || 'A definir'}`
    : `Sede: ${currentEvent.hostInfo.neutralSpot?.name || 'Punto intermedio'}`;

  const currentUrl = window.location.href.split("#")[0] + "#event=" + currentEvent.id;

  let expensesText = "";
  if (currentEvent.expenses && currentEvent.expenses.length > 0) {
    const totalAmount = currentEvent.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const settlements = calculateSettlements(currentEvent.expenses, currentEvent.attendees);

    expensesText = `\n💰 *Cuentas (Total: ${formatCurrency(totalAmount)}):*\n`;
    currentEvent.expenses.forEach(e => {
      const pCount = e.participants ? e.participants.length : currentEvent.attendees.length;
      expensesText += `  • ${e.desc} (${formatCurrency(e.amount)} - ${e.payer}): entre ${pCount} personas\n`;
    });
    if (settlements.length > 0) {
      expensesText += `*Transferencias para saldar:*\n`;
      expensesText += settlements.map(s => `  • ${s.from} le pasa ${formatCurrency(s.amount)} a ${s.to}`).join("\n") + "\n";
    }
  }

  return `*${currentEvent.title}*\n` +
         `Fecha: ${winnerDate}\n` +
         `${hostText}\n` +
         `Confirmados (${confirmed.length}): ${confirmed.join(", ") || 'Ninguno'}\n` +
         expensesText +
         `\nConfirmar o ver detalles en: ${currentUrl}`;
}

function shareOnWhatsApp() {
  const text = buildWhatsAppMessage();
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
}

function copyShareLink() {
  const url = window.location.href.split("#")[0] + "#event=" + currentEvent.id;
  navigator.clipboard.writeText(url).then(() => {
    alert("Enlace copiado");
  });
}

function initCountdown() {
  const timerEl = document.getElementById("deadline-countdown");
  if (!timerEl) return;

  function update() {
    if (!currentEvent || !currentEvent.deadline) return;
    const diff = new Date(currentEvent.deadline) - new Date();
    if (diff <= 0) {
      timerEl.textContent = "Finalizado";
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    timerEl.textContent = `${hours}h ${mins}m restantes`;
  }
  update();
  setInterval(update, 60000);
}

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

function createNewEventFromForm() {
  const title = document.getElementById("new-title-input")?.value.trim() || "Nueva Juntada";
  const org = document.getElementById("new-org-input")?.value.trim() || "Organizador";
  const d1 = document.getElementById("new-d1-input")?.value.trim() || "Viernes 21:00 hs";
  const d2 = document.getElementById("new-d2-input")?.value.trim() || "Sábado 22:00 hs";
  const hours = parseInt(document.getElementById("new-hours-input")?.value || "6");

  const newEv = {
    id: "juntada-" + Date.now(),
    title: title,
    organizer: org,
    deadline: new Date(Date.now() + hours * 3600 * 1000).toISOString(),
    dates: [
      { id: "d1", label: d1, votes: [] },
      { id: "d2", label: d2, votes: [] }
    ],
    hostInfo: {
      mode: "house",
      currentHost: org,
      neutralSpot: null,
      history: [{ name: org, count: 1, lastDate: "Hoy" }]
    },
    attendees: [{ name: org, status: "yes", isHost: true }],
    tasks: [
      { id: "t-clean", title: "Limpieza final", assignedTo: [], maxAssignees: 2, isPact: true },
      { id: "t-ice", title: "Hielo y vasos", assignedTo: [], maxAssignees: 1 },
      { id: "t-drinks", title: "Bebidas", assignedTo: [], maxAssignees: 2 },
      { id: "t-food", title: "Snacks", assignedTo: [], maxAssignees: 2 }
    ],
    expenses: []
  };

  allEvents.unshift(newEv);
  saveAllEvents();
  closeNewEventModal();
  openEventDetail(newEv.id);
}
