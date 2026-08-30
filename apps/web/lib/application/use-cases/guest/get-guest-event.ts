/**
 * Use Case: Get Guest Event
 * 
 * Carrega dados públicos do evento para o app do convidado.
 */

import { carregarEventoPublico, withEvent } from "@albora/db";
import type { Pool } from "pg";
import { MemoryTtlCache } from "@/lib/infrastructure/cache";

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

export const GUEST_EVENT_CACHE_TTL_MS = 60_000;

const guestEventCache = new MemoryTtlCache<NonNullable<GuestEventOutput>>(256);

export function resetGuestEventCache(): void {
  guestEventCache.clear();
}

/**
 * Carrega os dados públicos do evento (pack, identidade, brand_tokens).
 *
 * Usado pelo app Expo para configurar tema e identidade visual.
 * Cacheado em memória por `GUEST_EVENT_CACHE_TTL_MS` — em cache hit a
 * conexão nem chega a ser aberta.
 *
 * @param input - eventoId
 * @param pool - Pool de conexões
 * @returns Dados públicos do evento ou null se não encontrado
 */
export async function getGuestEvent(
  input: GetGuestEventInput,
  pool: Pool,
): Promise<GuestEventOutput> {
  const cached = guestEventCache.get(input.eventoId);
  if (cached) return structuredClone(cached);

  const evento = await withEvent(pool, input.eventoId, (c) =>
    carregarEventoPublico(c, input.eventoId),
  );

  if (!evento) {
    return null;
  }

  const output: NonNullable<GuestEventOutput> = {
    eventoId: evento.eventoId,
    packId: evento.packId,
    identityTokens: evento.identityTokens,
    vendorBrandTokens: evento.vendorBrandTokens,
    filtroRecomendado: evento.filtroRecomendado,
    fuso: evento.fuso,
  };

  guestEventCache.set(input.eventoId, structuredClone(output), GUEST_EVENT_CACHE_TTL_MS);
  return output;
}
