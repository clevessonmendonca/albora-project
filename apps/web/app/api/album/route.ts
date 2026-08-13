import { montarAlbumServido } from "@/lib/album";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  requireConfig,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const configError = requireConfig("album", { mediaOrigin: true });
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 30, keyPrefix: "album:" });
  if (limited) return limited;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    console.warn("album.evento_divergente", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
    });
    return errorResponse(403, "album.evento_divergente", "Esta sessão não pertence a este evento");
  }

  try {
    const album = await montarAlbumServido(auth.session.eventoId);

    console.log("album.montado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      paginas: album.totalDePaginas,
      fotos: album.contadores.fotos,
    });

    return jsonOk({ album });
  } catch (e) {
    return unexpectedError("album", e);
  }
}
