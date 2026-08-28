/**
 * Use Case: Get Wall Theme
 * 
 * Carrega tema do evento para o telão.
 */

import { withEvent } from "@albora/db";
import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { TokenLayer } from "@albora/tokens";
import type { Pool } from "pg";

export type GetWallThemeInput = {
  eventoId: string;
};

export type GetWallThemeOutput = Record<string, string>;

/**
 * Carrega tema (pack + identity tokens) do evento para o telão.
 * 
 * Usado no poll quando pareamento fica pronto para pintar antes do primeiro quadro.
 * 
 * @param input - eventoId
 * @param pool - Pool de conexões
 * @returns Variáveis CSS do tema
 */
export async function getWallTheme(
  input: GetWallThemeInput,
  pool: Pool,
): Promise<GetWallThemeOutput> {
  const row = await withEvent(pool, input.eventoId, async (c) => {
    const { rows } = await c.query<{
      pack_id: string;
      identity_tokens: unknown;
    }>("SELECT pack_id, identity_tokens FROM events WHERE id = $1", [
      input.eventoId,
    ]);
    return rows[0] ?? null;
  });

  const pack = row ? PACKS[row.pack_id] : undefined;
  const evento = (row?.identity_tokens ?? {}) as TokenLayer;

  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: pack ? { ...pack.tokens, fundo: "escuro" } : { fundo: "escuro" },
    evento,
  });

  return toVariables(tokens);
}
