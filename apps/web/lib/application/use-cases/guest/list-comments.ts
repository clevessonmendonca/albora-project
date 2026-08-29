import {
  type ComentarioComAutor,
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

function serializar(c: ComentarioComAutor, sessaoAtual: string): CommentAuthor {
  return {
    id: c.id,
    autor: c.autor,
    texto: c.texto,
    respostaA: c.respostaA,
    criadaEm: c.criadoEm.toISOString(),
    meu: c.sessaoId === sessaoAtual,
    sessaoAutor: c.sessaoId,
  };
}

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

  const porId = new Map(comentarios.map((c) => [c.id, c]));
  const thread = buildCommentThread(comentarios, input.uploadId);

  const serialized: CommentAuthor[] = [];
  for (const t of thread) {
    const raiz = porId.get(t.raiz.id);
    if (raiz) serialized.push(serializar(raiz, input.currentSessionId));
    for (const resposta of t.respostas) {
      const item = porId.get(resposta.id);
      if (item) serialized.push(serializar(item, input.currentSessionId));
    }
  }

  return { comentarios: serialized };
}
