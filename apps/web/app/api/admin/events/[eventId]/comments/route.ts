import {
  comEvento,
  listarComentariosParaModeracao,
  removerComentarioDoEvento,
} from "@albora/db";
import {
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
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const ADMIN_SESSAO = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;

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
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const comentarios = await comEvento(getPool(), eventId, (c) =>
      listarComentariosParaModeracao(c, eventId),
    );
    return jsonOk({ comentarios: serializar(comentarios) });
  } catch (e) {
    return unexpectedError("admin.comentarios.get", e);
  }
}

/** Remove comentário publicado pelo anfitrião (spec 014). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_comentarios:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const parsed = await parseJsonBody<{ comentarioId?: unknown }>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const comentarioId =
    typeof corpo.comentarioId === "string" && UUID_RE.test(corpo.comentarioId)
      ? corpo.comentarioId
      : null;
  if (!comentarioId) {
    return errorResponse(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const removido = await comEvento(getPool(), eventId, (c) =>
      removerComentarioDoEvento(c, comentarioId),
    );

    if (!removido) {
      return errorResponse(404, "comentario.nao_encontrado", "Comentário não encontrado");
    }

    console.log("admin.comentario_removido", {
      accountId: auth.host.accountId,
      eventId,
      comentarioId,
    });

    return jsonOk({ comentarioId, removido: true });
  } catch (e) {
    return unexpectedError("admin.comentarios.delete", e);
  }
}
