import { queueForScreen } from "@/features/music/lib/queue-for-screen";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { serializarMusicaDoCasal } from "@/lib/music-track";
import { consume } from "@/lib/rate-limit-store";
import {
  getEventMusic,
  setEventMusic,
} from "@/lib/application/use-cases/admin";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { setMusicSchema } from "@/lib/infrastructure/api/validators";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const result = await getEventMusic({ eventId }, getPool());
    return jsonOk({
      musica: serializarMusicaDoCasal(result.musica),
      sugestoes: queueForScreen(result.sugestoes),
    });
  } catch (e) {
    return unexpectedError("admin.musica.get", e);
  }
}

/** Casal cola link da faixa (spec 018): título e artista são enriquecimento — falha → grava o link e UI cai para a URL crua. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(
    `admin_musica:${auth.host.accountId}`,
    30,
    60,
    Date.now(),
  );
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validated = validateBody(parsed.data, setMusicSchema);
  if (validated instanceof Response) return validated;

  try {
    const resultado = await setEventMusic(
      {
        eventId,
        accountId: auth.host.accountId,
        url: validated.url,
      },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(422, resultado.code, resultado.message, resultado.details);
    }

    return jsonOk({ musica: serializarMusicaDoCasal(resultado.musica) });
  } catch (e) {
    return unexpectedError("admin.musica.put", e);
  }
}
