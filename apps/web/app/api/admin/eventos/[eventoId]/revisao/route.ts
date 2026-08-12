import {
  buscarEventoDoHost,
  comEvento,
  liberarComentarioDoEvento,
  liberarMidiaDoEvento,
  listarComentariosParaRevisao,
  listarMidiaParaRevisao,
  removerComentarioDoEvento,
} from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { hostDaRequisicao } from "@/lib/host-sessao";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function eventoDoHost(accountId: string, eventoId: string) {
  return buscarEventoDoHost(banco(), accountId, eventoId);
}

function serializar(
  midias: Awaited<ReturnType<typeof listarMidiaParaRevisao>>,
  comentarios: Awaited<ReturnType<typeof listarComentariosParaRevisao>>,
) {
  return {
    midias: midias.map((m) => ({
      id: m.id,
      autor: m.autor,
      denuncias: m.denuncias,
      classificador: m.classificador,
      motivo: m.motivo,
      criadaEm: m.criadaEm.toISOString(),
    })),
    comentarios: comentarios.map((c) => ({
      id: c.id,
      midiaId: c.midiaId,
      autor: c.autor,
      texto: c.texto,
      denuncias: c.denuncias,
      classificador: c.classificador,
      criadaEm: c.criadaEm.toISOString(),
    })),
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;
  if (!(await eventoDoHost(host.accountId, eventoId))) {
    return erro(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  try {
    const fila = await comEvento(banco(), eventoId, async (c) => {
      const [midias, comentarios] = await Promise.all([
        listarMidiaParaRevisao(c, eventoId),
        listarComentariosParaRevisao(c, eventoId),
      ]);
      return serializar(midias, comentarios);
    });
    return ok(fila);
  } catch (e) {
    return erroInesperado("admin.revisao.get", e);
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
  { params }: { params: Promise<{ eventoId: string }> },
) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const host = await hostDaRequisicao(req);
  if (!host) return erro(401, "admin.sem_sessao", "Entre no painel para continuar");

  const { eventoId } = await params;

  const limite = consumir(`admin_revisao:${host.accountId}`, 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  if (!(await eventoDoHost(host.accountId, eventoId))) {
    return erro(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const tipo = corpo.tipo === "midia" || corpo.tipo === "comentario" ? corpo.tipo : null;
  const acao = corpo.acao === "liberar" || corpo.acao === "remover" ? corpo.acao : null;
  const id = typeof corpo.id === "string" && UUID.test(corpo.id) ? corpo.id : null;

  if (!tipo || !acao || !id) {
    return erro(422, "validation_error", "Pedido inválido", { campos: ["tipo", "id", "acao"] });
  }

  if (tipo === "comentario" && acao === "remover") {
    try {
      const removido = await comEvento(banco(), eventoId, (c) =>
        removerComentarioDoEvento(c, id),
      );
      if (!removido) return erro(404, "comentario.nao_encontrado", "Comentário não encontrado");
      return ok({ id, removido: true });
    } catch (e) {
      return erroInesperado("admin.revisao.remover_comentario", e);
    }
  }

  if (acao !== "liberar") {
    return erro(422, "validation_error", "Só comentários podem ser removidos", { campos: ["acao"] });
  }

  try {
    const okAcao = await comEvento(banco(), eventoId, async (c) => {
      if (tipo === "midia") return liberarMidiaDoEvento(c, id);
      return liberarComentarioDoEvento(c, id);
    });

    if (!okAcao) return erro(404, "recurso.nao_encontrado", "Item não encontrado");

    console.log("admin.revisao_liberada", { accountId: host.accountId, eventoId, tipo, id });
    return ok({ id, tipo, liberado: true });
  } catch (e) {
    return erroInesperado("admin.revisao.liberar", e);
  }
}
