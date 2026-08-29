/**
 * Use Case: Update Challenges
 *
 * Atualiza missões do evento (pack ou custom).
 */
import {
  withEvent,
  listChallenges,
  substituirDesafios,
  substituirMissoesCustom,
} from "@albora/db";
import type { Pool } from "pg";
import type { ChallengeItem } from "./list-challenges";

export type PackMissionsInput = {
  eventId: string;
  packId: string;
  titleKeys: string[];
};

export type CustomMissionInput = {
  id?: string | undefined;
  titulo: string;
  posicao: number;
  emoji?: string | null | undefined;
};

export type CustomMissionsInput = {
  eventId: string;
  packId: string;
  customMissions: CustomMissionInput[];
};

export type UpdateChallengesOutput = {
  packId: string;
  challenges: ChallengeItem[];
};

export async function updatePackMissions(
  input: PackMissionsInput,
  pool: Pool,
): Promise<UpdateChallengesOutput> {
  await withEvent(pool, input.eventId, (c) =>
    substituirDesafios(c, input.eventId, input.titleKeys),
  );

  const challenges = await withEvent(pool, input.eventId, (c) =>
    listChallenges(c, input.eventId, null),
  );

  const serialized = challenges.map((d) => ({
    id: d.id,
    titleKey: d.chaveTitulo ?? null,
    customTitle: d.tituloCustom ?? null,
    emoji: d.emoji ?? null,
    position: d.ordem,
  }));

  return {
    packId: input.packId,
    challenges: serialized,
  };
}

export async function updateCustomMissions(
  input: CustomMissionsInput,
  pool: Pool,
): Promise<UpdateChallengesOutput> {
  const itens = input.customMissions.map((m) => ({
    titulo: m.titulo,
    posicao: m.posicao,
    ...(m.id !== undefined ? { id: m.id } : {}),
    ...(m.emoji !== undefined ? { emoji: m.emoji } : {}),
  }));

  await withEvent(pool, input.eventId, (c) =>
    substituirMissoesCustom(c, input.eventId, itens),
  );

  const challenges = await withEvent(pool, input.eventId, (c) =>
    listChallenges(c, input.eventId, null),
  );

  const serialized = challenges.map((d) => ({
    id: d.id,
    titleKey: d.chaveTitulo ?? null,
    customTitle: d.tituloCustom ?? null,
    emoji: d.emoji ?? null,
    position: d.ordem,
  }));

  return {
    packId: input.packId,
    challenges: serialized,
  };
}
