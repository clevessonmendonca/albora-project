import {
  withEvent,
  eventGate,
  reacaoDaSessao,
  apagarReacao,
} from "@albora/db";
import type { Pool } from "pg";

export type RemoveReactionInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
};

export type RemoveReactionResult =
  | { ok: true; reacoes: number; minha: null }
  | { ok: false; code: string };

export async function removeReaction(
  input: RemoveReactionInput,
  pool: Pool,
): Promise<RemoveReactionResult> {
  return withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);
    if (!gate) {
      return { ok: false as const, code: "reacao.evento_ausente" };
    }

    const tinha = await reacaoDaSessao(c, input.uploadId, input.sessaoId);
    if (!tinha) {
      const { rows } = await c.query<{ total: number }>(
        "SELECT count(*)::int AS total FROM reactions WHERE upload_id = $1",
        [input.uploadId],
      );
      return {
        ok: true as const,
        reacoes: rows[0]?.total ?? 0,
        minha: null,
      };
    }

    const reacoes = await apagarReacao(c, input.uploadId, input.sessaoId);
    return { ok: true as const, reacoes, minha: null };
  });
}
