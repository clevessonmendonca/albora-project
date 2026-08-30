/**
 * Use Case: Delete Comment
 * 
 * Remove um comentário, validando ownership e permissões.
 */

import {
  withEvent,
  removerComentario,
  ErroComentarioDeOutroEvento,
} from "@albora/db";
import type { Pool, PoolClient } from "pg";

export type DeleteCommentInput = {
  eventoId: string;
  sessaoId: string;
  comentarioId: string;
};

export type DeleteCommentResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Remove um comentário.
 * 
 * Validações:
 * - Comentário pertence ao evento
 * - Comentário pertence à sessão (ownership)
 * 
 * @param input - IDs do evento, sessão e comentário
 * @param getClient - Factory de conexão
 * @returns Resultado da remoção
 */
export async function deleteComment(
  input: DeleteCommentInput,
  getClient: () => Promise<PoolClient>,
): Promise<DeleteCommentResult> {
  const client = await getClient();

  try {
    // withEvent (comEvento) chama pool.connect() para abrir a transação com o SET LOCAL
    // de RLS — o client já foi obtido acima, então o "pool" aqui só devolve esse mesmo
    // client; release() fica no-op porque quem fecha a conexão é o finally deste use case.
    const pool = {
      connect: async () => ({
        query: client.query.bind(client),
        release: () => {},
      }),
    } as unknown as Pool;

    await withEvent(pool, input.eventoId, (c) =>
      removerComentario(c, {
        comentarioId: input.comentarioId,
        sessaoId: input.sessaoId,
      }),
    );

    return { ok: true };
  } catch (e) {
    if (e instanceof ErroComentarioDeOutroEvento) {
      return {
        ok: false,
        code: "comentario.outro_evento",
        message: "Comentário não pertence a este evento",
      };
    }

    // Outros erros (ex: comentário não encontrado, ownership)
    return {
      ok: false,
      code: "comentario.remocao_falhou",
      message: "Não foi possível remover o comentário",
    };
  } finally {
    client.release();
  }
}
