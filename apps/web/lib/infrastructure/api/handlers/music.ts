import { queueForScreen } from "@/features/music/lib/queue-for-screen";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventMismatch,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { serializarMusicaDoCasal } from "@/lib/music-track";
import { getGuestMusic, suggestMusic } from "@/lib/application/use-cases/guest";

type Corpo = { url?: unknown; evento?: unknown };

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "musica.evento_divergente",
  );
  if (mismatch) return mismatch;

  try {
    const result = await getGuestMusic(
      { eventoId: auth.session.eventoId },
      getPool(),
    );

    const musica = serializarMusicaDoCasal(result.escolhida);

    return jsonOk({
      musica,
      sugestoes: queueForScreen(result.sugestoes),
      interacao: result.interacao,
    });
  } catch (e) {
    return unexpectedError("musica.get", e);
  }
}

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 30 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const mismatch = rejectGuestEventMismatch(
    parsed.data.evento,
    auth.session,
    "musica.evento_divergente",
  );
  if (mismatch) return mismatch;

  if (typeof parsed.data.url !== "string") {
    return errorResponse(422, "validation_error", "Dados incompletos", {
      campos: ["url"],
    });
  }

  try {
    const resultado = await suggestMusic(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        url: parsed.data.url,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const status =
        resultado.code === "musica.interacao_fechada" ? 403 : 422;
      return errorResponse(
        status,
        resultado.code,
        resultado.message,
        resultado.details,
      );
    }

    return jsonOk({ aceita: true, sugestoes: queueForScreen(resultado.sugestoes) });
  } catch (e) {
    return unexpectedError("musica.post", e);
  }
}
