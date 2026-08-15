import { randomUUID } from "node:crypto";
import {
  type CommentCode,
  buildCommentThread,
  interactionOpen,
  publishComment,
  validateCommentText,
} from "@albora/core";
import {
  type ComentarioComAutor,
  type ComentarioGravado,
  comEvento,
  ErroComentarioDeOutroEvento,
  gateDoEvento,
  gravarComentario,
  listarComentariosVisiveisDaFoto,
  removerComentario,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { classifyCommentAfter } from "@/lib/classify-comment";
import { getPool } from "@/lib/db";

type Body = {
  uploadId?: unknown;
  texto?: unknown;
  respostaA?: unknown;
  id?: unknown;
};

type Outcome =
  | { ok: true; comentario: ComentarioGravado }
  | { ok: false; status: number; code: string; message: string };

function mapFailure(code: CommentCode): Outcome {
  switch (code) {
    case "comentario.gate_fechado":
    case "comentario.outro_evento":
      return { ok: false, status: 403, code, message: "Comentário recusado" };
    case "comentario.texto_vazio":
    case "comentario.texto_longo":
    case "comentario.resposta_ausente":
      return { ok: false, status: 422, code, message: "Comentário inválido" };
  }
}

function toJson(c: ComentarioComAutor, currentSessionId: string) {
  return {
    id: c.id,
    autor: c.autor,
    texto: c.texto,
    respostaA: c.respostaA,
    criadaEm: c.criadoEm.toISOString(),
    meu: c.sessaoId === currentSessionId,
    sessaoAutor: c.sessaoId,
  };
}

function gateIsOpen(
  gate: { interacaoAbreEm: Date | null } | null,
): gate is { interacaoAbreEm: Date | null } {
  return gate !== null && interactionOpen(gate, new Date());
}

export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "comentarios.evento_divergente",
  );
  if (mismatch) return mismatch;

  const uploadId = new URL(req.url).searchParams.get("upload_id");
  if (uploadId === null || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["upload_id"] });
  }

  try {
    const threads = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gateIsOpen(gate)) return [];

      const comments = await listarComentariosVisiveisDaFoto(
        c,
        auth.session.eventoId,
        uploadId,
        auth.session.sessaoId,
      );
      const byId = new Map(comments.map((row) => [row.id, row]));

      return buildCommentThread(comments, uploadId).map((t) => ({
        ...toJson(byId.get(t.raiz.id)!, auth.session.sessaoId),
        respostas: t.respostas.map((r) => toJson(byId.get(r.id)!, auth.session.sessaoId)),
      }));
    });

    console.log("comentarios.lista", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      threads: threads.length,
    });

    return jsonOk({ threads });
  } catch (e) {
    return unexpectedError("comentarios", e);
  }
}

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "comentarios.evento_divergente",
  );
  if (mismatch) return mismatch;

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId, texto, respostaA } = parsed.data;
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  if (typeof texto !== "string") {
    return errorResponse(422, "validation_error", "Texto inválido", { campos: ["texto"] });
  }

  const validated = validateCommentText(texto);
  if (!validated.ok) {
    return errorResponse(422, validated.codigo, "Comentário inválido", { campos: ["texto"] });
  }

  let replyTo: string | null = null;
  if (respostaA !== undefined && respostaA !== null) {
    if (typeof respostaA !== "string" || !UUID_RE.test(respostaA)) {
      return errorResponse(422, "validation_error", "Resposta inválida", { campos: ["respostaA"] });
    }
    replyTo = respostaA;
  }

  try {
    const result = await comEvento(getPool(), auth.session.eventoId, async (c): Promise<Outcome> => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gateIsOpen(gate)) {
        return {
          ok: false,
          status: 403,
          code: "comentario.gate_fechado",
          message: "A interação ainda não abriu",
        };
      }

      const existing = await listarComentariosVisiveisDaFoto(
        c,
        auth.session.eventoId,
        uploadId,
        auth.session.sessaoId,
      );

      const clientId =
        typeof parsed.data.id === "string" && UUID_RE.test(parsed.data.id)
          ? parsed.data.id
          : randomUUID();

      const published = publishComment(
        {
          id: clientId,
          eventoId: auth.session.eventoId,
          midiaId: uploadId,
          sessaoId: auth.session.sessaoId,
          texto: validated.texto,
          respostaA: replyTo,
        },
        { id: auth.session.eventoId, interacaoAbreEm: gate.interacaoAbreEm },
        existing,
        new Date(),
      );

      if (!published.ok) return mapFailure(published.codigo);

      const saved = await gravarComentario(c, {
        id: published.comentario.id,
        eventoId: published.comentario.eventoId,
        midiaId: published.comentario.midiaId,
        sessaoId: published.comentario.sessaoId,
        respostaA: published.comentario.respostaA,
        texto: published.comentario.texto,
      });

      return { ok: true, comentario: saved };
    });

    if (!result.ok) return errorResponse(result.status, result.code, result.message);

    console.log("comentarios.publicado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      comentarioId: result.comentario.id,
      resposta: result.comentario.respostaA !== null,
    });

    classifyCommentAfter(auth.session.eventoId, result.comentario.id, result.comentario.texto);

    return jsonOk(
      {
        id: result.comentario.id,
        texto: result.comentario.texto,
        respostaA: result.comentario.respostaA,
        criadaEm: result.comentario.criadoEm.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      return errorResponse(403, "comentario.outro_evento", "Comentário recusado");
    }
    return unexpectedError("comentarios", e);
  }
}

export async function DELETE(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "comentarios.evento_divergente",
  );
  if (mismatch) return mismatch;

  const parsed = await parseJsonBody<{ comentarioId?: unknown }>(req);
  if (parsed instanceof Response) return parsed;

  const commentId =
    typeof parsed.data.comentarioId === "string" && UUID_RE.test(parsed.data.comentarioId)
      ? parsed.data.comentarioId
      : null;
  if (!commentId) {
    return errorResponse(422, "validation_error", "Comentário inválido", { campos: ["comentarioId"] });
  }

  try {
    const removed = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const gate = await gateDoEvento(c, auth.session.eventoId);
      if (!gateIsOpen(gate)) return false;
      return removerComentario(c, { comentarioId: commentId, sessaoId: auth.session.sessaoId });
    });

    if (!removed) return errorResponse(403, "comentario.remover_negado", "Não foi possível remover");

    return jsonOk({ comentarioId: commentId, removido: true });
  } catch (e) {
    return unexpectedError("comentarios.remover", e);
  }
}
