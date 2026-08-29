import { randomUUID } from "node:crypto";
import {
  type CommentCode,
  interactionOpen,
  publishComment,
  validateCommentText,
} from "@albora/core";
import {
  type ComentarioGravado,
  withEvent,
  eventGate,
  gravarComentario,
  listarComentariosDaFoto,
} from "@albora/db";
import type { Pool } from "pg";
import { classifyCommentAfter } from "@/lib/classify-comment";

export type PublishCommentInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
  texto: string;
  respostaA: string | null;
  commentId?: string | undefined;
};

export type PublishCommentResult =
  | { ok: true; comentario: ComentarioGravado }
  | { ok: false; code: CommentCode; message: string };

export async function publishCommentUseCase(
  input: PublishCommentInput,
  pool: Pool,
): Promise<PublishCommentResult> {
  const textValidation = validateCommentText(input.texto);
  if (!textValidation.ok) {
    return {
      ok: false,
      code: textValidation.codigo,
      message: "Texto do comentário inválido",
    };
  }

  return withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);

    if (!gate || !interactionOpen(gate, new Date())) {
      return {
        ok: false,
        code: "comentario.gate_fechado",
        message: "Comentários ainda não estão liberados",
      };
    }

    const existentes = await listarComentariosDaFoto(c, input.eventoId, input.uploadId);
    const agora = new Date();
    const result = publishComment(
      {
        id: input.commentId ?? randomUUID(),
        eventoId: input.eventoId,
        midiaId: input.uploadId,
        sessaoId: input.sessaoId,
        texto: textValidation.texto,
        respostaA: input.respostaA,
      },
      { id: input.eventoId, interacaoAbreEm: gate.interacaoAbreEm },
      existentes,
      agora,
    );

    if (!result.ok) {
      return {
        ok: false,
        code: result.codigo,
        message: "Falha ao publicar comentário",
      };
    }

    const gravado = await gravarComentario(c, {
      id: result.comentario.id,
      eventoId: result.comentario.eventoId,
      midiaId: result.comentario.midiaId,
      sessaoId: result.comentario.sessaoId,
      respostaA: result.comentario.respostaA,
      texto: result.comentario.texto,
    });

    classifyCommentAfter(input.eventoId, gravado.id, gravado.texto);

    return { ok: true, comentario: gravado };
  });
}
