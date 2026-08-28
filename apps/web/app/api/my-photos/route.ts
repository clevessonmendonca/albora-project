import { modoInteracao } from "@albora/core";
import { withEvent, eventGate, listMyMedia } from "@albora/db";
import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "galeria.evento_divergente");
  if (mismatch) return mismatch;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  try {
    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const gate = await eventGate(c, auth.session.eventoId);
      if (!gate) return { interacao: "espelho" as const, enviadas: [] };

      const interacao = modoInteracao(gate, new Date());
      const modo = interacao === "completo" ? "completo" : "espelho";
      const enviadas = await listMyMedia(c, auth.session.sessaoId, modo);

      return { interacao, enviadas };
    });

    return jsonOk({
      interacao: resultado.interacao,
      enviadas: resultado.enviadas.map((m) => ({
        id: m.id,
        chaveThumb: m.chaveThumb,
        chaveFull: m.chaveFull,
        mime: m.mime,
        criadaEm: m.criadaEm.toISOString(),
        autor: m.autor,
        legenda: m.legenda,
        lugar: m.lugar,
        ...(typeof m.reacoes === "number" ? { reacoes: m.reacoes } : {}),
        ...(m.minhaReacao !== undefined ? { minhaReacao: m.minhaReacao } : {}),
      })),
    });
  } catch (e) {
    return unexpectedError("galeria.minhas", e);
  }
}
