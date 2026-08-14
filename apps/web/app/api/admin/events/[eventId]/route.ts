import {
  abrirInteracaoDoEvento,
  atualizarModeracaoDoEvento,
  comEvento,
  lerMetricasAoVivo,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "@albora/db";
import { decidirTese, type CodigoDaTese } from "@albora/core";
import {
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

const ADMIN_SESSAO = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;

type Corpo = {
  panico?: unknown;
  haMenores?: unknown;
  modoEndurecido?: unknown;
  abrirInteracao?: unknown;
};

function comoBooleano(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

/** Painel ao vivo: participação, fotos e fila de revisão (spec 009). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_painel:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const dados = await comEvento(getPool(), eventId, async (c) => {
      const metricas = await lerMetricasAoVivo(c, eventId);
      const midias = await listarMidiaParaRevisao(c, eventId);
      const comentarios = await listarComentariosParaRevisao(c, eventId);
      return { metricas, filaRevisao: midias.length + comentarios.length };
    });

    const veredito = decidirTese({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: dados.metricas.sessoesComUpload,
    });

    const ultimas = await Promise.all(
      dados.metricas.ultimas.map(async (f) => ({
        id: f.id,
        criadaEm: f.criadaEm.toISOString(),
        thumb: await assinarGet(f.chaveThumb, VALIDADE_GET_SEGUNDOS),
      })),
    );

    return jsonOk({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: dados.metricas.sessoesComUpload,
      totalFotos: dados.metricas.totalFotos,
      filaRevisao: dados.filaRevisao,
      participacao: veredito.taxa,
      veredito: veredito.codigo as CodigoDaTese,
      ultimas,
    });
  } catch (e) {
    return unexpectedError("admin.painel", e);
  }
}

/**
 * Toggles de moderacao do evento (roadmap A2, spec 011, ADR 0012).
 *
 * A conta vem da sessao de host; `comConta` impede alterar evento alheio.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_moderacao:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const panico = comoBooleano(corpo.panico);
  const haMenores = comoBooleano(corpo.haMenores);
  const modoEndurecido = comoBooleano(corpo.modoEndurecido);
  const abrirInteracao = comoBooleano(corpo.abrirInteracao);

  if (
    panico === undefined &&
    haMenores === undefined &&
    modoEndurecido === undefined &&
    abrirInteracao === undefined
  ) {
    return errorResponse(422, "validation_error", "Nada para atualizar", {
      campos: ["panico", "haMenores", "modoEndurecido", "abrirInteracao"],
    });
  }

  try {
    let evento = await atualizarModeracaoDoEvento(getPool(), auth.host.accountId, eventId, {
      ...(panico !== undefined ? { panico } : {}),
      ...(haMenores !== undefined ? { haMenores } : {}),
      ...(modoEndurecido !== undefined ? { modoEndurecido } : {}),
    });

    if (abrirInteracao === true) {
      evento = await abrirInteracaoDoEvento(getPool(), auth.host.accountId, eventId);
    }

    if (!evento) {
      return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
    }

    console.log("admin.moderacao_atualizada", {
      accountId: auth.host.accountId,
      eventId,
      panico: evento.moderacao.panico,
      haMenores: evento.moderacao.haMenores,
      modoEndurecido: evento.moderacao.modoEndurecido,
      interacaoAberta: abrirInteracao === true,
    });

    return jsonOk({
      moderacao: evento.moderacao,
      interacaoAbreEm: evento.interacaoAbreEm?.toISOString() ?? null,
    });
  } catch (e) {
    return unexpectedError("admin.moderacao", e);
  }
}
