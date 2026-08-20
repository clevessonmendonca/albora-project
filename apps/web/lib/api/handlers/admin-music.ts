import { ordenarSugestoes, parseMusicLink } from "@albora/core";
import {
  withEvent,
  definirMusicaDoCasal,
  listarSugestoes,
  musicaDoCasal,
} from "@albora/db";
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
import { metadadoParaFaixaDoCasal, serializarMusicaDoCasal } from "@/lib/music-track";
import { consume } from "@/lib/rate-limit-store";

type Corpo = { url?: unknown };

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
    const corpo = await withEvent(getPool(), eventId, async (c) => {
      const musica = await musicaDoCasal(c, eventId);
      const fila = ordenarSugestoes(await listarSugestoes(c, eventId));
      return { musica, fila };
    });
    return jsonOk({
      musica: serializarMusicaDoCasal(corpo.musica),
      sugestoes: queueForScreen(corpo.fila),
    });
  } catch (e) {
    return unexpectedError("admin.musica.get", e);
  }
}

/**
 * O casal cola o link da faixa (spec 018). Título e artista são
 * enriquecimento: o mesmo resolvedor das sugestões tenta preencher; se
 * falhar, grava o link e a UI cai para a URL crua.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_musica:${auth.host.accountId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  if (typeof corpo.url !== "string" || corpo.url.trim() === "") {
    return errorResponse(422, "validation_error", "Cole o link da faixa", { campos: ["url"] });
  }

  const lido = parseMusicLink(corpo.url.trim());
  if (!lido.ok) {
    return errorResponse(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }

  try {
    const metadado = await metadadoParaFaixaDoCasal(lido.link);

    await withEvent(getPool(), eventId, (c) =>
      definirMusicaDoCasal(c, {
        eventoId: eventId,
        link: lido.link,
        metadado,
      }),
    );

    const musica = await withEvent(getPool(), eventId, (c) => musicaDoCasal(c, eventId));

    console.log("admin.musica_definida", {
      accountId: auth.host.accountId,
      eventId,
      provedor: lido.link.provedor,
    });

    return jsonOk({ musica: serializarMusicaDoCasal(musica) });
  } catch (e) {
    return unexpectedError("admin.musica.put", e);
  }
}
