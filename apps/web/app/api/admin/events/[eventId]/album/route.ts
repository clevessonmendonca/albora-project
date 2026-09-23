import {
  destacarMidiaDoHost,
  listarDestaques,
  listarMidiaDoAlbum,
  ocultarMidiaDoHost,
  withEvent,
} from "@albora/db";
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
import { assinarGet } from "@/lib/r2";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

type Acao = "ocultar" | "destacar" | "remover-destaque";

type Corpo = { midiaId?: unknown; acao?: unknown };

/** `acao` ausente significa ocultar: era o unico comportamento da rota, e cliente em voo nao pode quebrar. */
function comoAcao(v: unknown): Acao | null {
  if (v === undefined) return "ocultar";
  return v === "ocultar" || v === "destacar" || v === "remover-destaque" ? v : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_album:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;

    const { midias, destaques } = await withEvent(getPool(), eventId, async (c) => ({
      midias: await listarMidiaDoAlbum(c, eventId, 120),
      destaques: await listarDestaques(c, eventId),
    }));

    const itens = await Promise.all(
      midias.map(async (m) => ({
        id: m.id,
        missaoId: m.missaoId,
        lugarId: m.lugarId,
        reacoes: m.reacoes,
        criadaEm: m.recebidaEm.toISOString(),
        thumb: await assinarGet(m.chaveThumb, VALIDADE_GET_SEGUNDOS),
      })),
    );

    return jsonOk({ itens, total: itens.length, destaques });
  } catch (e) {
    return unexpectedError("admin.album", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const midiaId = typeof corpo.midiaId === "string" ? corpo.midiaId : "";
  if (!midiaId) {
    return errorResponse(422, "validation_error", "midiaId obrigatório", { campos: ["midiaId"] });
  }

  const acao = comoAcao(corpo.acao);
  if (!acao) {
    return errorResponse(422, "validation_error", "Ação desconhecida", { campos: ["acao"] });
  }

  try {
    if (acao === "ocultar") {
      const ocultou = await ocultarMidiaDoHost(getPool(), auth.host.accountId, eventId, midiaId);
      if (!ocultou) return errorResponse(404, "midia.nao_encontrada", "Foto não encontrada");
      return jsonOk({ oculta: true });
    }

    const mudou = await destacarMidiaDoHost(
      getPool(),
      auth.host.accountId,
      eventId,
      midiaId,
      acao === "destacar",
    );
    if (!mudou) return errorResponse(404, "midia.nao_encontrada", "Foto não encontrada");
    return jsonOk({ destacada: acao === "destacar" });
  } catch (e) {
    return unexpectedError("admin.album", e);
  }
}
