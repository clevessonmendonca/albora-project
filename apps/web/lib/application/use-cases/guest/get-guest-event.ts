/**
 * Use Case: Get Guest Event
 * 
 * Carrega dados públicos do evento para o app do convidado.
 */

import { carregarEventoPublico, withEvent } from "@albora/db";
import type { Pool, PoolClient } from "pg";

export type GuestEventOutput = {
  eventoId: string;
  packId: string;
  identityTokens: Record<string, unknown>;
  vendorBrandTokens: Record<string, unknown> | null;
  filtroRecomendado: string | null;
  fuso: string;
} | null;

export type GetGuestEventInput = {
  eventoId: string;
};

/**
 * Carrega os dados públicos do evento (pack, identidade, brand_tokens).
 * 
 * Usado pelo app Expo para configurar tema e identidade visual.
 * 
 * @param input - eventoId
 * @param getClient - Factory de conexão
 * @returns Dados públicos do evento ou null se não encontrado
 */
export async function getGuestEvent(
  input: GetGuestEventInput,
  getClient: () => Promise<PoolClient>,
): Promise<GuestEventOutput> {
  const client = await getClient();

  try {
    const evento = await withEvent(
      { query: client.query.bind(client) } as unknown as Pool,
      input.eventoId,
      (c) => carregarEventoPublico(c, input.eventoId),
    );

    if (!evento) {
      return null;
    }

    return {
      eventoId: evento.eventoId,
      packId: evento.packId,
      identityTokens: evento.identityTokens,
      vendorBrandTokens: evento.vendorBrandTokens,
      filtroRecomendado: evento.filtroRecomendado,
      fuso: evento.fuso,
    };
  } finally {
    client.release();
  }
}
