import { withEvent, listChallenges, packDoEvento } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import type { Pool } from "pg";

export type GuestMission = {
  id: string;
  titulo: string;
  emoji: string | null;
  feito: boolean;
};

export type ListGuestMissionsInput = {
  eventoId: string;
  sessaoId: string;
};

export type ListGuestMissionsOutput = {
  missoes: GuestMission[];
};

export async function listGuestMissions(
  input: ListGuestMissionsInput,
  pool: Pool,
): Promise<ListGuestMissionsOutput> {
  const { desafios, packId } = await withEvent(pool, input.eventoId, async (c) => {
    const [d, p] = await Promise.all([
      listChallenges(c, input.eventoId, input.sessaoId),
      packDoEvento(c, input.eventoId),
    ]);
    return { desafios: d, packId: p };
  });

  const pack = packId ? (PACKS[packId] ?? null) : null;

  const missoes: GuestMission[] = desafios.map((d) => {
    const titulo =
      d.tituloCustom ??
      (pack && d.chaveTitulo ? resolvePackText(pack, d.chaveTitulo) : (d.chaveTitulo ?? ""));
    return {
      id: d.id,
      titulo,
      emoji: d.emoji ?? null,
      feito: d.feito,
    };
  });

  return { missoes };
}
