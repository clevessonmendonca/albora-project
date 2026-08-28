/**
 * API Handler: Comments (GET, POST, DELETE)
 * 
 * Camada HTTP que delega para use cases.
 */

import { randomUUID } from "node:crypto";
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
import { getPool } from "@/lib/db";
import { eventGate, withEvent } from "@albora/db";
import { interactionOpen } from "@albora/core";
import {
  listComments,
  publishCommentUseCase,
  deleteComment,
} from "@/lib/application/use-cases/guest";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import {
  publishCommentSchema,
  deleteCommentSchema,
} from "@/lib/infrastructure/api/validators";

/**
 * GET: Lista comentários de uma foto
 */
export async function GET(req: Request): Promise<Response> {
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

  // Validação de query params
  const uploadId = new URL(req.url).searchParams.get("upload_id");
  if (uploadId === null || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", {
      campos: ["upload_id"],
    });
  }

  try {
    // Verifica gate
    const gate = await withEvent(getPool(), auth.session.eventoId, (c) =>
      eventGate(c, auth.session.eventoId),
    );

    if (!gate || !interactionOpen(gate, new Date())) {
      // Gate fechado: retorna lista vazia
      return jsonOk({ comentarios: [] });
    }

    // Use case
    const result = await listComments(
      {
        eventoId: auth.session.eventoId,
        uploadId,
        currentSessionId: auth.session.sessaoId,
      },
      () => getPool().connect(),
    );

    return jsonOk(result);
  } catch (e) {
    return unexpectedError("comentarios.guest.list", e);
  }
}

/**
 * POST: Publica um comentário
 */
export async function POST(req: Request): Promise<Response> {
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

  // Parse e valida body
  const body = await parseJsonBody(req);
  const validated = validateBody(body, publishCommentSchema);
  if (validated instanceof Response) return validated;

  try {
    // Use case
    const result = await publishCommentUseCase(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        uploadId: validated.uploadId,
        texto: validated.texto,
        respostaA: validated.respostaA ?? null,
        commentId: validated.id ?? randomUUID(),
      },
      () => getPool().connect(),
    );

    if (!result.ok) {
      // Mapeia código para status HTTP
      const status =
        result.code === "comentario.gate_fechado" ||
        result.code === "comentario.outro_evento"
          ? 403
          : 422;
      return errorResponse(status, result.code, result.message);
    }

    return jsonOk({
      comentario: {
        id: result.comentario.id,
        texto: result.comentario.texto,
        criadoEm: result.comentario.criadoEm.toISOString(),
      },
    });
  } catch (e) {
    return unexpectedError("comentarios.guest.post", e);
  }
}

/**
 * DELETE: Remove um comentário
 */
export async function DELETE(req: Request): Promise<Response> {
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

  // Parse e valida body
  const body = await parseJsonBody(req);
  const validated = validateBody(body, deleteCommentSchema);
  if (validated instanceof Response) return validated;

  try {
    // Use case
    const result = await deleteComment(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        comentarioId: validated.comentarioId,
      },
      () => getPool().connect(),
    );

    if (!result.ok) {
      const status = result.code === "comentario.outro_evento" ? 403 : 422;
      return errorResponse(status, result.code, result.message);
    }

    return jsonOk({ sucesso: true });
  } catch (e) {
    return unexpectedError("comentarios.guest.delete", e);
  }
}
