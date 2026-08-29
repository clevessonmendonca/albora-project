/**
 * Use Case: List Comments
 *
 * Lista os comentários visíveis de uma foto, organizados em thread.
 */

import { buildCommentThread } from "@albora/core";
import {
  withEvent,
  listarComentariosVisiveisDaFoto,
} from "@albora/db";
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

export async function listComments(
  input: ListCommentsInput,
  pool: Pool,
): Promise<ListCommentsOutput> {
  const comentarios = await withEvent(pool, input.eventoId, (c) =>
    listarComentariosVisiveisDaFoto(c, input.eventoId, input.uploadId, input.currentSessionId),
  );

  const thread = buildCommentThread(comentarios, input.uploadId);
  const flattened = thread.flatMap((t) => [t.raiz, ...t.respostas]);
  const autorPorId = new Map(comentarios.map((c) => [c.id, c.autor]));

  const serialized = flattened.map((c) => ({
    id: c.id,
    autor: autorPorId.get(c.id) ?? "",
    texto: c.texto,
    respostaA: c.respostaA,
    criadaEm: c.criadoEm.toISOString(),
    meu: c.sessaoId === input.currentSessionId,
    sessaoAutor: c.sessaoId,
  }));

  return { comentarios: serialized };
}
