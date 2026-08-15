import {
  comEvento,
  denunciarComentario,
  ErroComentarioDeOutroEvento,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Corpo = { comentarioId?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "comentarios.evento_divergente",
  );
  if (mismatch) return mismatch;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const comentarioId =
    typeof parsed.data.comentarioId === "string" && UUID_RE.test(parsed.data.comentarioId)
      ? parsed.data.comentarioId
      : null;
  if (!comentarioId) {
    return errorResponse(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, (c) =>
      denunciarComentario(c, { comentarioId, sessaoId: auth.session.sessaoId }),
    );

    console.log("comentarios.denuncia", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      comentarioId,
      nova: resultado.registrada,
    });

    return jsonOk({ registrada: resultado.registrada });
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      return errorResponse(404, "comentario.inexistente", "Comentário não encontrado");
    }
    return unexpectedError("comentarios.denuncia", e);
  }
}
