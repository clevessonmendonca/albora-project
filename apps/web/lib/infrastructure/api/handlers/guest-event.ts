import {
  errorResponse,
  jsonOk,
  requireGuestSession,
  unexpectedError,
  enforceRateLimit,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { getGuestEvent } from "@/lib/application/use-cases/guest";

/** Tema do evento para o app Expo (pack, identidade, brand_tokens): eventoId vem só da sessão, nunca do query string. */
export async function getGuestEventHandler(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    max: 60,
    message: "Espere um instante",
  });
  if (limited) return limited;

  try {
    const evento = await getGuestEvent(
      { eventoId: auth.session.eventoId },
      () => getPool().connect(),
    );

    if (!evento) {
      return errorResponse(404, "evento.ausente", "Evento não encontrado");
    }

    return jsonOk({
      eventoId: evento.eventoId,
      packId: evento.packId,
      identityTokens: evento.identityTokens,
      vendorBrandTokens: evento.vendorBrandTokens,
      filtroRecomendado: evento.filtroRecomendado,
      fuso: evento.fuso,
    });
  } catch (e) {
    return unexpectedError("guest.event", e);
  }
}
