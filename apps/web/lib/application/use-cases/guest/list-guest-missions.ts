/**
 * Use Case: List Guest Missions
 * 
 * Lista as missões disponíveis para um convidado, incluindo
 * o status de completude de cada uma.
 */

import { withEvent, listChallenges, packDoEvento } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import type { Pool, PoolClient } from "pg";

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

/**
 * Lista as missões do evento para o convidado.
 * 
 * @param input - ID do evento e sessão do convidado
 * @param pool - Pool de conexões do banco
 * @returns Lista de missões com status
 */
export async function listGuestMissions(
  input: ListGuestMissionsInput,
  getClient: () => Promise<PoolClient>,
): Promise<ListGuestMissionsOutput> {
  const client = await getClient();
  
  try {
    // withEvent (comEvento) chama pool.connect() para abrir a transação com o SET LOCAL
    // de RLS — o client já foi obtido acima, então o "pool" aqui só devolve esse mesmo
    // client; release() fica no-op porque quem fecha a conexão é o finally deste use case.
    const pool = {
      connect: async () => ({
        query: client.query.bind(client),
        release: () => {},
      }),
    } as unknown as Pool;

    const { desafios, packId } = await withEvent(
      pool,
      input.eventoId,
      async (c) => {
        const [d, p] = await Promise.all([
          listChallenges(c, input.eventoId, input.sessaoId),
          packDoEvento(c, input.eventoId),
        ]);
        return { desafios: d, packId: p };
      },
    );

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
  } finally {
    client.release();
  }
}
