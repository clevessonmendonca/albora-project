import { withEvent, listReactionsForMedia } from "@albora/db";
import type { Pool } from "pg";

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

export async function listReactions(
  input: ListReactionsInput,
  pool: Pool,
): Promise<ListReactionsOutput> {
  const nomes = await withEvent(pool, input.eventoId, (c) =>
    listReactionsForMedia(c, input.uploadId, input.sessaoId),
  );

  return {
    reatores: nomes.map((item) => ({
      nome: item.nome,
      sessaoId: item.sessaoId,
    })),
  };
}
