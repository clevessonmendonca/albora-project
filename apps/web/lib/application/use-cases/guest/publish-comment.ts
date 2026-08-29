/**
 * Use Case: Publish Comment
 *
 * Publica um comentário em uma foto, validando permissões,
 * conteúdo e regras de negócio.
 */

import { randomUUID } from "node:crypto";
import {
  interactionOpen,
  publishComment,
} from "@albora/core";
import {
  type ComentarioGravado,
  withEvent,
  eventGate,
  gravarComentario,
  listarComentariosVisiveisDaFoto,
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
  | { ok: false; code: string; message: string };

export async function publishCommentUseCase(
  input: PublishCommentInput,
  pool: Pool,
): Promise<PublishCommentResult> {
  return withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);

    if (!gate || !interactionOpen(gate, new Date())) {
      return {
        ok: false as const,
        code: "comentario.gate_fechado",
        message: "Comentários ainda não estão liberados",
      };
    }

    const existentes = await listarComentariosVisiveisDaFoto(
      c,
      input.eventoId,
      input.uploadId,
      input.sessaoId,
    );
    const resultado = publishComment(
      {
        id: input.commentId ?? randomUUID(),
        eventoId: input.eventoId,
        midiaId: input.uploadId,
        sessaoId: input.sessaoId,
        texto: input.texto,
        respostaA: input.respostaA,
      },
      { id: input.eventoId, interacaoAbreEm: gate.interacaoAbreEm },
      existentes,
      new Date(),
    );

    if (!resultado.ok) {
      return {
        ok: false as const,
        code: resultado.codigo,
        message: "Falha ao publicar comentário",
      };
    }

    const gravado = await gravarComentario(c, {
      id: resultado.comentario.id,
      eventoId: resultado.comentario.eventoId,
      midiaId: resultado.comentario.midiaId,
      sessaoId: resultado.comentario.sessaoId,
      respostaA: resultado.comentario.respostaA,
      texto: resultado.comentario.texto,
    });

    classifyCommentAfter(input.eventoId, gravado.id, input.texto);

    return { ok: true as const, comentario: gravado };
  });
}
