/**
 * Reglas de sede: elegir anfitrión, rotación equitativa, ceder el turno y punto neutro.
 */
const eventRepository = require("../repositories/eventRepository");
const memberRepository = require("../repositories/memberRepository");
const { requireMember } = require("./accessService");
const { buildView } = require("./eventService");
const { parseId } = require("../utils/validators");
const { BadRequestError, ForbiddenError } = require("../errors/AppError");

const NEUTRAL_SPOTS = ["Bar / Birrería", "Plaza / Parque"];

/**
 * Próximo anfitrión según la rotación equitativa: el integrante que menos veces recibió
 * en otras juntadas, sin contar al anfitrión actual. En empate, el que se sumó primero.
 */
function pickNextHost(view) {
  const candidates = view.hostInfo.history.filter(h => h.userId !== view.hostInfo.currentHost);
  return candidates.length > 0 ? candidates[0].userId : null;
}

async function update(eventId, userId, { action, userId: chosenUserId, spot }) {
  const { event } = await requireMember(eventId, userId);

  if (action === "neutral") {
    if (!NEUTRAL_SPOTS.includes(spot)) throw new BadRequestError("Punto neutro inválido");
    await eventRepository.update(event, { hostMode: "neutral", neutralSpot: spot });

  } else if (action === "set") {
    const hostId = parseId(chosenUserId);
    const memberIds = await memberRepository.listUserIds(event.id);
    if (!memberIds.includes(hostId)) throw new BadRequestError("El anfitrión tiene que ser integrante de la juntada");
    await eventRepository.update(event, { hostMode: "house", currentHostId: hostId });

  } else if (action === "rotate" || action === "cede") {
    if (action === "cede" && event.currentHostId !== userId) {
      throw new ForbiddenError("Solo el anfitrión actual puede ceder su turno");
    }
    const next = pickNextHost(await buildView(event.id, userId));
    if (!next) throw new BadRequestError("No hay otro integrante para ser anfitrión");
    await eventRepository.update(event, { hostMode: "house", currentHostId: next });

  } else {
    throw new BadRequestError("Acción de sede inválida");
  }

  return buildView(event.id, userId);
}

module.exports = { NEUTRAL_SPOTS, pickNextHost, update };
