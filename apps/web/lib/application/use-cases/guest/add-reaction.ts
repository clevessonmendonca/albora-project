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

export async function addReaction(
  input: AddReactionInput,
  pool: Pool,
): Promise<AddReactionResult> {
  return withEvent(pool, input.eventoId, async (c) => {
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
