/**
 * Use Case: Publish Comment
 * 
 * Publica um comentário em uma foto, validando permissões,
 * conteúdo e regras de negócio.
 */

import { randomUUID } from "node:crypto";
import {
  type CommentCode,
  buildCommentThread,
  interactionOpen,
  publishComment,
  validateCommentText,
} from "@albora/core";
import {
  type ComentarioGravado,
  withEvent,
  eventGate,
  gravarComentario,
} from "@albora/db";
import type { PoolClient } from "pg";
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
 * @param getClient - Factory de conexão ao banco
 * @returns Resultado com comentário gravado ou erro
 */
export async function publishCommentUseCase(
  input: PublishCommentInput,
  getClient: () => Promise<PoolClient>,
): Promise<PublishCommentResult> {
  const client = await getClient();

  try {
    // Validação do gate
    const gate = await withEvent(
      { query: client.query.bind(client) } as any,
      input.eventoId,
      (c) => eventGate(c, input.eventoId),
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
    if (textValidation !== "comentario.ok") {
      return {
        ok: false,
        code: textValidation,
        message: "Texto do comentário inválido",
      };
    }

    // Publicar comentário (lógica de domínio)
    const result = await publishComment(
      {
        id: input.commentId ?? randomUUID(),
        eventoId: input.eventoId,
        sessaoId: input.sessaoId,
        uploadId: input.uploadId,
        texto: input.texto,
        respostaA: input.respostaA,
      },
      async (cmd) => {
        return await withEvent(
          { query: client.query.bind(client) } as any,
          input.eventoId,
          (c) => gravarComentario(c, cmd),
        );
      },
    );

    if (!result.ok) {
      return {
        ok: false,
        code: result.code,
        message: "Falha ao publicar comentário",
      };
    }

    // Classificação assíncrona (não bloqueia resposta)
    classifyCommentAfter(input.eventoId, result.comentario.id, input.texto);

    return { ok: true, comentario: result.comentario };
  } finally {
    client.release();
  }
}
