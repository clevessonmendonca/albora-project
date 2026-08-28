import { withEvent, activeStoriesForEvent, thumbKeyFromFull } from "@albora/db";
import {
  enforceRateLimit,
  jsonOk,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Stories do evento — sem gate (espelho); `activeStoriesForEvent` filtra janela 24h; `autor` é só primeiro nome (concessão `ler.identidade`). */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "stories:" });
  if (limited) return limited;

  try {
    const stories = await withEvent(getPool(), auth.session.eventoId, (c) =>
      activeStoriesForEvent(c, auth.session.eventoId),
    );

    return jsonOk({
      itens: stories.map((s) => ({
        id: s.id,
        autor: s.autor,
        chaveThumb: thumbKeyFromFull(s.storageKey),
        sessaoId: s.sessaoId,
      })),
    });
  } catch (e) {
    return unexpectedError("stories", e);
  }
}
