/**
 * Use Case: Publish Comment
 * 
 * Publica um comentário em uma foto, validando permissões,
 * conteúdo e regras de negócio.
 */

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
  commentId?: string;
};

export type PublishCommentResult =
  | { ok: true; comentario: ComentarioGravado }
  | { ok: false; code: CommentCode; message: string };

/**
 * Publica um comentário em uma foto.
 * 
 * Validações:
 * - Gate de interação aberto
 * - Texto válido (não vazio, tamanho)
 * - Upload existe no evento
 * - Comentário pai existe (se resposta)
 * 
 * @param input - Dados do comentário
 * @param pool - Pool de conexões
 * @returns Resultado com comentário gravado ou erro
 */
export async function publishCommentUseCase(
  input: PublishCommentInput,
  pool: Pool,
): Promise<PublishCommentResult> {
  // Validação do gate
  const gate = await withEvent(pool, input.eventoId, (c) =>
    eventGate(c, input.eventoId),
  );

  if (!gate || !interactionOpen(gate, new Date())) {
    return {
      ok: false,
      code: "comentario.gate_fechado",
      message: "Comentários ainda não estão liberados",
    };
  }

  // Validação do texto
  const textValidation = validateCommentText(input.texto);
  if (!textValidation.ok) {
    return {
      ok: false,
      code: textValidation.codigo,
      message: "Texto do comentário inválido",
    };
  }

  // Publicar comentário (lógica de domínio) + gravação, na mesma transação
  const result = await withEvent(pool, input.eventoId, async (c) => {
    const existentes = await listarComentariosDaFoto(
      c,
      input.eventoId,
      input.uploadId,
    );

    const publicado = publishComment(
      {
        id: input.commentId ?? randomUUID(),
        eventoId: input.eventoId,
        midiaId: input.uploadId,
        sessaoId: input.sessaoId,
        texto: textValidation.texto,
        respostaA: input.respostaA,
      },
      { interacaoAbreEm: gate.interacaoAbreEm, id: input.eventoId },
      existentes,
      new Date(),
    );

    if (!publicado.ok) return publicado;

    const gravado = await gravarComentario(c, {
      id: publicado.comentario.id,
      eventoId: publicado.comentario.eventoId,
      midiaId: publicado.comentario.midiaId,
      sessaoId: publicado.comentario.sessaoId,
      respostaA: publicado.comentario.respostaA,
      texto: publicado.comentario.texto,
    });

    return { ok: true as const, comentario: gravado };
  });

  if (!result.ok) {
    return {
      ok: false,
      code: result.codigo,
      message: "Falha ao publicar comentário",
    };
  }

  // Classificação assíncrona (não bloqueia resposta)
  classifyCommentAfter(input.eventoId, result.comentario.id, input.texto);

  return { ok: true, comentario: result.comentario };
}
