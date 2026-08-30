/**
 * Use Case: List Reactions
 * 
 * Lista as reações de uma foto específica.
 */

import { withEvent, listReactionsForMedia } from "@albora/db";
import type { Pool, PoolClient } from "pg";

export type ReactionReactor = {
  nome: string;
  sessaoId: string;
};

export type ListReactionsInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
};

export type ListReactionsOutput = {
  reatores: ReactionReactor[];
};

/**
 * Lista os nomes das pessoas que reagiram a uma foto.
 * 
 * @param input - IDs do evento, sessão e upload
 * @param getClient - Factory de conexão
 * @returns Lista de reatores (nome + sessaoId)
 */
export async function listReactions(
  input: ListReactionsInput,
  getClient: () => Promise<PoolClient>,
): Promise<ListReactionsOutput> {
  const client = await getClient();

  try {
    const nomes = await withEvent(
      { query: client.query.bind(client) } as unknown as Pool,
      input.eventoId,
      (c) => listReactionsForMedia(c, input.uploadId, input.sessaoId),
    );

    return {
      reatores: nomes.map((item) => ({
        nome: item.nome,
        sessaoId: item.sessaoId,
      })),
    };
  } finally {
    client.release();
  }
}
