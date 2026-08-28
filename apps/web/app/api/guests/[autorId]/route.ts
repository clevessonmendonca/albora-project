import { modoInteracao } from "@albora/core";
import {
  withEvent,
  ErroCursorInvalido,
  eventGate,
  listFeed,
  guestProfile,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Perfil do convidado — só após gate; id forjado antes do gate ou de outro evento devolve "não encontrado" (RLS + bloqueio). */
export async function GET(req: Request, { params }: { params: Promise<{ autorId: string }> }) {
  const { autorId } = await params;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "perfil.evento_divergente");
  if (mismatch) return mismatch;

  if (!UUID_RE.test(autorId)) {
    return errorResponse(422, "validation_error", "Id inválido", { campos: ["autorId"] });
  }

  const cursor = new URL(req.url).searchParams.get("cursor");

  try {
    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const gate = await eventGate(c, auth.session.eventoId);
      if (!gate) return null;

      const interacao = modoInteracao(gate, new Date());
      if (interacao !== "completo") return null;

      const perfil = await guestProfile(c, {
        eventoId: auth.session.eventoId,
        autorId,
        leitorId: auth.session.sessaoId,
      });
      if (!perfil) return null;

      const pagina = await listFeed(c, {
        eventoId: auth.session.eventoId,
        modo: "completo",
        missaoId: null,
        cursor,
        sessaoId: auth.session.sessaoId,
        autorId,
      });

      return { nome: perfil.nome, ...pagina };
    });

    if (!resultado) {
      return errorResponse(404, "perfil.nao_encontrado", "Perfil não encontrado");
    }

    return jsonOk(resultado);
  } catch (e) {
    if (e instanceof ErroCursorInvalido) {
      return errorResponse(422, e.code, "Cursor inválido", { campos: ["cursor"] });
    }
    return unexpectedError("perfil", e);
  }
}
