/**
 * Use Case: List Comments
 * 
 * Lista os comentários visíveis de uma foto, organizados em thread.
 */

import {
  withEvent,
  listarComentariosVisiveisDaFoto,
} from "@albora/db";
import { buildCommentThread } from "@albora/core";
import type { Pool } from "pg";

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
 * @param pool - Pool de conexões
 * @returns Lista de comentários ordenados por thread
 */
export async function listComments(
  input: ListCommentsInput,
  pool: Pool,
): Promise<ListCommentsOutput> {
  const comentarios = await withEvent(pool, input.eventoId, (c) =>
    listarComentariosVisiveisDaFoto(
      c,
      input.eventoId,
      input.uploadId,
      input.currentSessionId,
    ),
  );

  // Ordena por thread (domínio)
  const thread = buildCommentThread(comentarios, input.uploadId);
  const porId = new Map(comentarios.map((c) => [c.id, c] as const));

  // Serializa para JSON, achatando raiz + respostas na ordem da thread
  const serialized = thread
    .flatMap((t) => [t.raiz, ...t.respostas])
    .map((c) => ({
      id: c.id,
      // thread reaproveita os mesmos objetos de `comentarios` — porId sempre tem o id.
      autor: porId.get(c.id)!.autor,
      texto: c.texto,
      respostaA: c.respostaA,
      criadaEm: c.criadoEm.toISOString(),
      meu: c.sessaoId === input.currentSessionId,
      sessaoAutor: c.sessaoId,
    }));

  return { comentarios: serialized };
}
