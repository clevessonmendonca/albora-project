import { modoInteracao } from "@albora/core";
import {
  comEvento,
  desafioDoEvento,
  ErroCursorInvalido,
  gateDoEvento,
  listarFeed,
  type PaginaFeed,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const VAZIO: PaginaFeed = { itens: [], proximoCursor: null };

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parametros = new URL(req.url).searchParams;
  const eventoPedido = parametros.get("evento");

  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    console.warn("feed.evento_divergente", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
    });
    return errorResponse(403, "feed.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const missao = parametros.get("missao");
  if (missao !== null && !UUID_RE.test(missao)) {
    return errorResponse(422, "validation_error", "Filtro inválido", { campos: ["missao"] });
  }

  const cursor = parametros.get("cursor");

  try {
    const pagina = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gate) return { ...VAZIO, interacao: "espelho" as const };

      const interacao = modoInteracao(gate, new Date());

      if (missao !== null && !(await desafioDoEvento(c, auth.session.eventoId, missao))) {
        return { ...VAZIO, interacao };
      }

      const itens = await listarFeed(c, {
        eventoId: auth.session.eventoId,
        modo: interacao,
        missaoId: missao,
        cursor,
        sessaoId: auth.session.sessaoId,
      });

      return { ...itens, interacao };
    });

    console.log("feed.pagina", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      itens: pagina.itens.length,
      comFiltro: missao !== null,
      continua: pagina.proximoCursor !== null,
      interacao: pagina.interacao,
    });

    return jsonOk(pagina);
  } catch (e) {
    if (e instanceof ErroCursorInvalido) {
      return errorResponse(422, e.code, "Cursor inválido", { campos: ["cursor"] });
    }
    return unexpectedError("feed", e);
  }
}
