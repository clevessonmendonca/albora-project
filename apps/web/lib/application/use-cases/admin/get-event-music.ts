/**
 * Use Case: Get Event Music
 * 
 * Lista música do casal e fila de sugestões.
 */

import { ordenarSugestoes } from "@albora/core";
import { withEvent, listarSugestoes, musicaDoCasal } from "@albora/db";
import type { Pool } from "pg";

export type GetEventMusicInput = {
  eventId: string;
};

export type GetEventMusicOutput = {
  musica: Awaited<ReturnType<typeof musicaDoCasal>>;
  sugestoes: Awaited<ReturnType<typeof listarSugestoes>>;
};

/**
 * Carrega música do casal e fila de sugestões.
 * 
 * @param input - eventId
 * @param pool - Pool de conexões
 * @returns Música do casal e sugestões ordenadas
 */
export async function getEventMusic(
  input: GetEventMusicInput,
  pool: Pool,
): Promise<GetEventMusicOutput> {
  const corpo = await withEvent(pool, input.eventId, async (c) => {
    const musica = await musicaDoCasal(c, input.eventId);
    const fila = ordenarSugestoes(await listarSugestoes(c, input.eventId));
    return { musica, sugestoes: fila };
  });

  return corpo;
}
