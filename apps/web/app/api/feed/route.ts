import { ErroCursorInvalido } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  enforceRateLimit,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { listFeedUseCase } from "@/lib/application/use-cases/guest";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { listFeedSchema } from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "feed.evento_divergente",
  );
  if (mismatch) return mismatch;

  const query = Object.fromEntries(new URL(req.url).searchParams);
  const validated = validateBody(query, listFeedSchema);
  if (validated instanceof Response) return validated;

  try {
    const pagina = await listFeedUseCase(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        missaoId: validated.missao,
        cursor: validated.cursor,
      },
      () => getPool().connect(),
    );

    console.log("feed.pagina", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      itens: pagina.itens.length,
      comFiltro: validated.missao !== null,
      continua: pagina.proximoCursor !== null,
      interacao: pagina.interacao,
    });

    return jsonOk(pagina);
  } catch (e) {
    if (e instanceof ErroCursorInvalido) {
      return errorResponse(422, e.code, "Cursor inválido", {
        campos: ["cursor"],
      });
    }
    return unexpectedError("feed", e);
  }
}
