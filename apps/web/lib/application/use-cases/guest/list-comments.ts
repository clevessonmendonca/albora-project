/**
 * Use Case: List Comments
 * 
 * Lista os comentários visíveis de uma foto, organizados em thread.
 */

import {
  type ComentarioComAutor,
  withEvent,
  listarComentariosVisiveisDaFoto,
} from "@albora/db";
import { buildCommentThread } from "@albora/core";
import type { PoolClient } from "pg";

export type CommentAuthor = {
  id: string;
  autor: string;
  texto: string;
  respostaA: string | null;
  criadaEm: string;
  meu: boolean;
  sessaoAutor: string;
};

export type ListCommentsInput = {
  eventoId: string;
  uploadId: string;
  currentSessionId: string;
};

export type ListCommentsOutput = {
  comentarios: CommentAuthor[];
};

/**
 * Lista comentários de uma foto.
 * 
 * @param input - Evento, upload e sessão atual
 * @param getClient - Factory de conexão
 * @returns Lista de comentários ordenados por thread
 */
export async function listComments(
  input: ListCommentsInput,
  getClient: () => Promise<PoolClient>,
): Promise<ListCommentsOutput> {
  const client = await getClient();

  try {
    const comentarios = await withEvent(
      { query: client.query.bind(client) } as any,
      input.eventoId,
      (c) => listarComentariosVisiveisDaFoto(c, input.uploadId),
    );

    // Ordena por thread (domínio)
    const thread = buildCommentThread(comentarios);

    // Serializa para JSON
    const serialized = thread.map((c) => ({
      id: c.id,
      autor: c.autor,
      texto: c.texto,
      respostaA: c.respostaA,
      criadaEm: c.criadoEm.toISOString(),
      meu: c.sessaoId === input.currentSessionId,
      sessaoAutor: c.sessaoId,
    }));

    return { comentarios: serialized };
  } finally {
    client.release();
  }
}
