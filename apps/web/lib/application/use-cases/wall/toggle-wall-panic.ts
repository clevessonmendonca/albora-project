/**
 * Use Case: Toggle Wall Panic
 * 
 * Alterna o modo pânico do evento (pausa/retoma a parede).
 */

import { alternarPanicoDoEvento } from "@albora/db";
import type { Pool } from "pg";

export type ToggleWallPanicInput = {
  eventoId: string;
};

export type ToggleWallPanicOutput =
  | { ok: true; panico: boolean }
  | { ok: false; code: "evento.nao_encontrado" };

/**
 * Alterna o modo pânico do evento.
 * 
 * Usado pelo telão para pausar/retomar exibição sem abrir o admin.
 * Único toggle do crachá da TV.
 * 
 * @param input - eventoId
 * @param pool - Pool de conexões
 * @returns Estado do pânico ou erro se evento não encontrado
 */
export async function toggleWallPanic(
  input: ToggleWallPanicInput,
  pool: Pool,
): Promise<ToggleWallPanicOutput> {
  const panico = await alternarPanicoDoEvento(pool, input.eventoId);

  if (panico === null) {
    return { ok: false, code: "evento.nao_encontrado" };
  }

  console.log("parede.panico_alternado", { eventoId: input.eventoId, panico });
  return { ok: true, panico };
}
