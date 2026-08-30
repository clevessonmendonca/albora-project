/**
 * Use Case: List Feed
 * 
 * Lista o feed de fotos do evento com suporte a filtros e paginação.
 */

import { modoInteracao } from "@albora/core";
import {
  withEvent,
  challengeBelongsToEvent,
  eventGate,
  listFeed,
  type PaginaFeed,
} from "@albora/db";
import type { Pool } from "pg";

const VAZIO: PaginaFeed = { itens: [], proximoCursor: null };

export type FeedInteractionMode = "espelho" | "completo";

export type ListFeedInput = {
  eventoId: string;
  sessaoId: string;
  missaoId?: string | null;
  cursor?: string | null;
};

export type ListFeedOutput = {
  itens: PaginaFeed["itens"];
  proximoCursor: string | null;
  interacao: FeedInteractionMode;
};

/**
 * Lista o feed de fotos do evento.
 * 
 * Validações:
 * - Verifica gate do evento (modo de interação)
 * - Valida se missão pertence ao evento (quando filtro aplicado)
 * - Valida cursor de paginação
 * 
 * @param input - Parâmetros do feed (filtros, paginação)
 * @param pool - Pool de conexões
 * @returns Página do feed com modo de interação
 * @throws {ErroCursorInvalido} Se cursor é inválido
 */
export async function listFeedUseCase(
  input: ListFeedInput,
  pool: Pool,
): Promise<ListFeedOutput> {
  const pagina = await withEvent(pool, input.eventoId, async (c) => {
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

  return pagina;
}
