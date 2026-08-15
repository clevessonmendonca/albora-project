import { exibirMusica, lerLinkDeMusica, ordenarSugestoes } from "@albora/core";
import {
  comEvento,
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
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Corpo = { url?: unknown };

function serializar(
  musica: Awaited<ReturnType<typeof musicaDoCasal>>,
): { provedor: string; rotulo: string; url: string } | null {
  if (!musica) return null;
  const exibicao = exibirMusica(musica.link, musica.metadado);
  return {
    provedor: musica.link.provedor,
    rotulo: exibicao.rotulo,
    url: exibicao.url,
  };
}

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
    const corpo = await comEvento(getPool(), eventId, async (c) => {
      const musica = await musicaDoCasal(c, eventId);
      const fila = ordenarSugestoes(await listarSugestoes(c, eventId));
      return { musica, fila };
    });
    return jsonOk({
      musica: serializar(corpo.musica),
      sugestoes: queueForScreen(corpo.fila),
    });
  } catch (e) {
    return unexpectedError("admin.musica.get", e);
  }
}

/**
 * O casal cola o link da faixa (spec 018). Metadado rico fica fora do caminho
 * crítico — sem título, a UI cai para o link cru.
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

  const lido = lerLinkDeMusica(corpo.url.trim());
  if (!lido.ok) {
    return errorResponse(422, lido.erro.code, "Link não aceito", lido.erro.details);
  }

  try {
    await comEvento(getPool(), eventId, (c) =>
      definirMusicaDoCasal(c, {
        eventoId: eventId,
        link: lido.link,
        metadado: null,
      }),
    );

    const musica = await comEvento(getPool(), eventId, (c) => musicaDoCasal(c, eventId));

    console.log("admin.musica_definida", {
      accountId: auth.host.accountId,
      eventId,
      provedor: lido.link.provedor,
    });

    return jsonOk({ musica: serializar(musica) });
  } catch (e) {
    return unexpectedError("admin.musica.put", e);
  }
}
