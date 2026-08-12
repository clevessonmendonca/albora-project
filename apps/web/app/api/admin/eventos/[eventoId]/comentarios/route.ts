import {
  buscarEventoDoHost,
  comEvento,
  listarComentariosParaModeracao,
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
  lista: Awaited<ReturnType<typeof listarComentariosParaModeracao>>,
) {
  return lista.map((c) => ({
    id: c.id,
    midiaId: c.midiaId,
    autor: c.autor,
    texto: c.texto,
    denuncias: c.denuncias,
    criadaEm: c.criadoEm.toISOString(),
    classificador: c.classificador,
  }));
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
    const comentarios = await comEvento(banco(), eventoId, (c) =>
      listarComentariosParaModeracao(c, eventoId),
    );
    return ok({ comentarios: serializar(comentarios) });
  } catch (e) {
    return erroInesperado("admin.comentarios.get", e);
  }
}

/** Remove comentário publicado pelo anfitrião (spec 014). */
export async function DELETE(
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

  const limite = consumir(`admin_comentarios:${host.accountId}`, 60, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  if (!(await eventoDoHost(host.accountId, eventoId))) {
    return erro(404, "evento.nao_encontrado", "Evento não encontrado");
  }

  let corpo: { comentarioId?: unknown };
  try {
    corpo = (await req.json()) as { comentarioId?: unknown };
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const comentarioId =
    typeof corpo.comentarioId === "string" && UUID.test(corpo.comentarioId)
      ? corpo.comentarioId
      : null;
  if (!comentarioId) {
    return erro(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const removido = await comEvento(banco(), eventoId, (c) =>
      removerComentarioDoEvento(c, comentarioId),
    );

    if (!removido) {
      return erro(404, "comentario.nao_encontrado", "Comentário não encontrado");
    }

    console.log("admin.comentario_removido", {
      accountId: host.accountId,
      eventoId,
      comentarioId,
    });

    return ok({ comentarioId, removido: true });
  } catch (e) {
    return erroInesperado("admin.comentarios.delete", e);
  }
}
