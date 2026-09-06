import {
  abrirInteracaoDoEvento,
  agendarInteracaoDoEvento,
  atualizarModeracaoDoEvento,
  publicarEvento,
  withEvent,
  lerMetricasAoVivo,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
} from "@albora/db";
import { decidirTese, type CodigoDaTese } from "@albora/core";
import {
  ADMIN_SESSION_REQUIRED,
  ANY_HOST_ROLES,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { assinarGet } from "@/lib/r2";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

type Corpo = {
  panico?: unknown;
  haMenores?: unknown;
  modoEndurecido?: unknown;
  abrirInteracao?: unknown;
  /** ISO-8601 ou `null` para fechar o gate de novo. */
  interacaoAbreEm?: unknown;
  /** Só aceita `"active"` — este endpoint publica, nunca encerra (task 6, gap I1). */
  status?: unknown;
};

function comoBooleano(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  return undefined;
}

function comoAbertura(v: unknown): Date | null | undefined {
  if (v === null) return null;
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
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

  const limite = consume(`admin_painel:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEventRole(auth.host.accountId, eventId, ANY_HOST_ROLES);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const dados = await withEvent(getPool(), eventId, async (c) => {
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
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
  const interacaoAbreEm =
    corpo.interacaoAbreEm !== undefined ? comoAbertura(corpo.interacaoAbreEm) : undefined;
  const publicar = corpo.status !== undefined && corpo.status === "active";

  if (
    corpo.interacaoAbreEm !== undefined &&
    interacaoAbreEm === undefined &&
    corpo.interacaoAbreEm !== null
  ) {
    return errorResponse(422, "validation_error", "Horário inválido", {
      campos: ["interacaoAbreEm"],
    });
  }

  if (corpo.status !== undefined && !publicar) {
    return errorResponse(422, "validation_error", "Só aceita status active", {
      campos: ["status"],
    });
  }

  if (
    panico === undefined &&
    haMenores === undefined &&
    modoEndurecido === undefined &&
    abrirInteracao === undefined &&
    interacaoAbreEm === undefined &&
    !publicar
  ) {
    return errorResponse(422, "validation_error", "Nada para atualizar", {
      campos: ["panico", "haMenores", "modoEndurecido", "abrirInteracao", "interacaoAbreEm", "status"],
    });
  }

  const allowedRoles = haMenores !== undefined ? COUPLE_HOST_ROLES : ANY_HOST_ROLES;
  const access = await requireHostEventRole(auth.host.accountId, eventId, allowedRoles);
  if (access instanceof Response) return access;

  try {
    let evento = await atualizarModeracaoDoEvento(getPool(), auth.host.accountId, eventId, {
      ...(panico !== undefined ? { panico } : {}),
      ...(haMenores !== undefined ? { haMenores } : {}),
      ...(modoEndurecido !== undefined ? { modoEndurecido } : {}),
    });

    if (abrirInteracao === true) {
      evento = await abrirInteracaoDoEvento(getPool(), auth.host.accountId, eventId);
    } else if (interacaoAbreEm !== undefined) {
      evento = await agendarInteracaoDoEvento(
        getPool(),
        auth.host.accountId,
        eventId,
        interacaoAbreEm,
      );
    }

    if (publicar) {
      evento = await publicarEvento(getPool(), auth.host.accountId, eventId);
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
      status: evento.status,
    });

    return jsonOk({
      moderacao: evento.moderacao,
      interacaoAbreEm: evento.interacaoAbreEm?.toISOString() ?? null,
      status: evento.status,
    });
  } catch (e) {
    return unexpectedError("admin.moderacao", e);
  }
}
