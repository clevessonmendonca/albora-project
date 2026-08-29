import {
  withEvent,
  removerComentario,
  ErroComentarioDeOutroEvento,
} from "@albora/db";
import type { Pool } from "pg";

export type DeleteCommentInput = {
  eventoId: string;
  sessaoId: string;
  comentarioId: string;
};

export type DeleteCommentResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function deleteComment(
  input: DeleteCommentInput,
  pool: Pool,
): Promise<DeleteCommentResult> {
  try {
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

    return {
      ok: false,
      code: "comentario.remocao_falhou",
      message: "Não foi possível remover o comentário",
    };
  }
}
