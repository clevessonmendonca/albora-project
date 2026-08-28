/**
 * Use Case: Add Reaction
 * 
 * Adiciona uma reação a uma foto.
 */

import { withEvent, adicionarReacao } from "@albora/db";
import type { PoolClient } from "pg";

export type ReactionType = "curtir" | "amar" | "rir" | "chorar" | "aplaudir";

export type AddReactionInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
  tipo: ReactionType;
};

export type AddReactionResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Adiciona reação a uma foto.
 * 
 * Se a sessão já tinha uma reação no upload, substitui.
 * 
 * @param input - Dados da reação
 * @param getClient - Factory de conexão
 * @returns Resultado da operação
 */
export async function addReaction(
  input: AddReactionInput,
  getClient: () => Promise<PoolClient>,
): Promise<AddReactionResult> {
  const client = await getClient();

  try {
    await withEvent(
      { query: client.query.bind(client) } as any,
      input.eventoId,
      (c) =>
        adicionarReacao(c, {
          eventoId: input.eventoId,
          sessaoId: input.sessaoId,
          uploadId: input.uploadId,
          tipo: input.tipo,
        }),
    );

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      code: "reacao.adicao_falhou",
      message: "Não foi possível adicionar a reação",
    };
  } finally {
    client.release();
  }
}
