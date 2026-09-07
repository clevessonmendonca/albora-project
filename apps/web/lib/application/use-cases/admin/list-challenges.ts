/**
 * Use Case: List Challenges
 *
 * Lista desafios/missões de um evento (pack + custom).
 */
import { withEvent, listChallenges } from "@albora/db";
import type { Pool } from "pg";

export type ChallengeItem = {
  id: string;
  titleKey: string | null;
  customTitle: string | null;
  emoji: string | null;
  position: number;
};

export type ListChallengesInput = {
  eventId: string;
  packId: string;
};

export type ListChallengesOutput = {
  packId: string;
  challenges: ChallengeItem[];
};

export async function listChallengesUseCase(
  input: ListChallengesInput,
  pool: Pool,
): Promise<ListChallengesOutput> {
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
