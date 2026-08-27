import {
  withEvent,
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
  ocultarMidiaDoHost,
  removerComentarioDoEvento,
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
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { assinarGet } from "@/lib/r2";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const fila = await withEvent(getPool(), eventId, async (c) => {
      const [midias, comentarios] = await Promise.all([
        listarMidiaParaRevisao(c, eventId),
        listarComentariosParaRevisao(c, eventId),
      ]);
      return { midias, comentarios };
    });

    const [midiasSerializadas, comentariosSerializados] = await Promise.all([
      Promise.all(
        fila.midias.map(async (m) => ({
          id: m.id,
          autor: m.autor,
          denuncias: m.denuncias,
          pedidosDeRemocao: m.pedidosDeRemocao,
          classificador: m.classificador,
          motivo: m.motivo,
          criadaEm: m.criadaEm.toISOString(),
          thumb: await assinarGet(m.thumbKey, VALIDADE_GET_SEGUNDOS),
        })),
      ),
      Promise.resolve(
        fila.comentarios.map((c) => ({
          id: c.id,
          midiaId: c.midiaId,
          autor: c.autor,
          texto: c.texto,
          denuncias: c.denuncias,
          classificador: c.classificador,
          criadaEm: c.criadaEm.toISOString(),
        })),
      ),
    ]);

    return jsonOk({ midias: midiasSerializadas, comentarios: comentariosSerializados });
  } catch (e) {
    return unexpectedError("admin.revisao.get", e);
  }
}

type Corpo = {
  tipo?: unknown;
  id?: unknown;
  acao?: unknown;
};

/** Libera ou remove item retido na fila de revisão (spec 011, 014). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_revisao:${auth.host.accountId}`, 60, 60, Date.now());
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

  const tipo = corpo.tipo === "midia" || corpo.tipo === "comentario" ? corpo.tipo : null;
  const acao =
    corpo.acao === "liberar" || corpo.acao === "remover" || corpo.acao === "ocultar"
      ? corpo.acao
      : null;
  const id = typeof corpo.id === "string" && UUID_RE.test(corpo.id) ? corpo.id : null;

  if (!tipo || !acao || !id) {
    return errorResponse(422, "validation_error", "Pedido inválido", { campos: ["tipo", "id", "acao"] });
  }

  if (tipo === "comentario" && acao === "remover") {
    try {
      const removido = await withEvent(getPool(), eventId, (c) =>
        removerComentarioDoEvento(c, id),
      );
      if (!removido) return errorResponse(404, "comentario.nao_encontrado", "Comentário não encontrado");
      return jsonOk({ id, removido: true });
    } catch (e) {
      return unexpectedError("admin.revisao.remover_comentario", e);
    }
  }

  if (tipo === "midia" && acao === "ocultar") {
    try {
      const ocultou = await ocultarMidiaDoHost(getPool(), auth.host.accountId, eventId, id);
      if (!ocultou) return errorResponse(404, "midia.nao_encontrada", "Foto não encontrada");
      return jsonOk({ id, oculta: true });
    } catch (e) {
      return unexpectedError("admin.revisao.ocultar_midia", e);
    }
  }

  if (acao !== "liberar") {
    return errorResponse(422, "validation_error", "Ação inválida para este tipo", { campos: ["acao"] });
  }

  try {
    const okAcao = await withEvent(getPool(), eventId, async (c) => {
      if (tipo === "midia") return liberarMidiaDoEvento(c, id);
      return liberarComentarioDoEvento(c, id);
    });

    if (!okAcao) return errorResponse(404, "recurso.nao_encontrado", "Item não encontrado");

    console.log("admin.revisao_liberada", { accountId: auth.host.accountId, eventId, tipo, id });
    return jsonOk({ id, tipo, liberado: true });
  } catch (e) {
    return unexpectedError("admin.revisao.liberar", e);
  }
}
