/**
 * Use Case: Get Guest Music
 * 
 * Lista música escolhida do casal e fila de sugestões.
 */

import { interactionMode, ordenarSugestoes, type ModoInteracao } from "@albora/core";
import {
  withEvent,
  eventGate,
  listarSugestoes,
  musicaDoCasal,
} from "@albora/db";
import type { Pool } from "pg";

export type GetGuestMusicInput = {
  eventoId: string;
};

export type GetGuestMusicOutput = {
  escolhida: Awaited<ReturnType<typeof musicaDoCasal>>;
  sugestoes: Awaited<ReturnType<typeof listarSugestoes>>;
  interacao: ModoInteracao;
};

/**
 * Lista música escolhida e sugestões.
 * 
 * @param input - eventoId
 * @param pool - Pool de conexões
 * @returns Música escolhida, sugestões ordenadas e modo de interação
 */
export async function getGuestMusic(
  input: GetGuestMusicInput,
  pool: Pool,
): Promise<GetGuestMusicOutput> {
  const corpo = await withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);
    const escolhida = await musicaDoCasal(c, input.eventoId);
    const fila = ordenarSugestoes(await listarSugestoes(c, input.eventoId));
    return {
      escolhida,
      fila,
      interacao: gate ? interactionMode(gate, new Date()) : ("espelho" as const),
    };
  });

  return {
    escolhida: corpo.escolhida,
    sugestoes: corpo.fila,
    interacao: corpo.interacao,
  };
}
