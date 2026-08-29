import { modoInteracao, type ModoInteracao } from "@albora/core";
import {
  withEvent,
  challengeBelongsToEvent,
  eventGate,
  listFeed,
  type PaginaFeed,
} from "@albora/db";
import type { Pool } from "pg";

const VAZIO: PaginaFeed = { itens: [], proximoCursor: null };

export type FeedInteractionMode = ModoInteracao;

export type ListFeedInput = {
  eventoId: string;
  sessaoId: string;
  missaoId?: string | null | undefined;
  cursor?: string | null | undefined;
};

export type ListFeedOutput = {
  itens: PaginaFeed["itens"];
  proximoCursor: string | null;
  interacao: FeedInteractionMode;
};

export async function listFeedUseCase(
  input: ListFeedInput,
  pool: Pool,
): Promise<ListFeedOutput> {
  return withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);
    if (!gate) return { ...VAZIO, interacao: "espelho" as const };

    const interacao = modoInteracao(gate, new Date());

    if (
      input.missaoId !== null &&
      input.missaoId !== undefined &&
      !(await challengeBelongsToEvent(c, input.eventoId, input.missaoId))
    ) {
      return { ...VAZIO, interacao };
    }

    const itens = await listFeed(c, {
      eventoId: input.eventoId,
      modo: interacao,
      missaoId: input.missaoId ?? null,
      cursor: input.cursor ?? null,
      sessaoId: input.sessaoId,
    });

    return { ...itens, interacao };
  });
}
