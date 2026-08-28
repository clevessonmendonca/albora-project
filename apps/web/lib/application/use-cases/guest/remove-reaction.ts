/**
 * Use Case: Remove Reaction
 * 
 * Remove a reação de uma sessão em uma foto.
 */

import { withEvent, removerReacao } from "@albora/db";
import type { PoolClient } from "pg";

export type RemoveReactionInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
};

export type RemoveReactionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Remove a reação de uma foto.
 * 
 * Se não havia reação, a operação é idempotente (sucesso).
 * 
 * @param input - IDs do evento, sessão e upload
 * @param getClient - Factory de conexão
 * @returns Resultado da remoção
 */
export async function removeReaction(
  input: RemoveReactionInput,
  getClient: () => Promise<PoolClient>,
): Promise<RemoveReactionResult> {
  const client = await getClient();

  try {
    await withEvent(
      { query: client.query.bind(client) } as any,
      input.eventoId,
      (c) =>
        removerReacao(c, {
          eventoId: input.eventoId,
          sessaoId: input.sessaoId,
          uploadId: input.uploadId,
        }),
    );

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      code: "reacao.remocao_falhou",
      message: "Não foi possível remover a reação",
    };
  } finally {
    client.release();
  }
}
