import { modoInteracao } from "@albora/core";
import { comEvento, gateDoEvento, listarMinhasDoEvento } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    return errorResponse(403, "galeria.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate) return { interacao: "espelho" as const, enviadas: [] };

      const interacao = modoInteracao(gate, new Date());
      const modo = interacao === "completo" ? "completo" : "espelho";
      const enviadas = await listarMinhasDoEvento(c, auth.session.sessaoId, modo);

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
