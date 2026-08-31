/**
 * Use Case: Add Reaction
 * 
 * Adiciona uma reação a uma foto com validações completas.
 */

import {
  withEvent,
  eventGate,
  eventPack,
  midiaPublicadaDoEvento,
  gravarReacao,
} from "@albora/db";
import { PACKS, isValidReaction } from "@albora/packs";
import type { Pool } from "pg";

export type ReactionType = "curtir" | "amar" | "rir" | "chorar" | "aplaudir";

export type AddReactionInput = {
  eventoId: string;
  sessaoId: string;
  uploadId: string;
  tipo: string;
};

export type AddReactionResult =
  | { ok: true; reacoes: number; minha: string }
  | { ok: false; code: string };

/**
 * Adiciona reação a uma foto.
 * 
 * Validações:
 * - Evento existe e está visível (gate)
 * - Mídia pertence ao evento
 * - Tipo de reação é válido para o pack do evento
 * 
 * Se a sessão já tinha uma reação no upload, substitui.
 * 
 * @param input - Dados da reação
 * @param pool - Pool de conexões
 * @returns Resultado com total de reações ou erro
 */
export async function addReaction(
  input: AddReactionInput,
  pool: Pool,
): Promise<AddReactionResult> {
  return withEvent(pool, input.eventoId, async (c) => {
    // Reagir não espera o gate (ADR 0009) — só evento precisa existir/ser visível sob RLS
    const gate = await eventGate(c, input.eventoId);
    if (!gate) {
      return { ok: false as const, code: "reacao.evento_ausente" };
    }

    if (!(await midiaPublicadaDoEvento(c, input.eventoId, input.uploadId))) {
      return { ok: false as const, code: "reacao.midia_ausente" };
    }

    const packId = await eventPack(c, input.eventoId);
    const pack = packId ? PACKS[packId] : undefined;
    if (!pack || !isValidReaction(pack, input.tipo)) {
      return { ok: false as const, code: "reacao.tipo_invalido" };
    }

    const reacoes = await gravarReacao(
      c,
      input.eventoId,
      input.uploadId,
      input.sessaoId,
      input.tipo,
    );
    return { ok: true as const, reacoes, minha: input.tipo };
  });
}
