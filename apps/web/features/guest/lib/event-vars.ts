import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, toVariables, resolveTokens, type TokenLayer } from "@albora/tokens";
import type { CSSProperties } from "react";

export function eventVars(event: EventoPublico): CSSProperties {
  const pack = PACKS[event.packId];
  const eventLayer = event.identityTokens as TokenLayer;
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      ...(pack ? { pack: pack.tokens } : {}),
      ...(Object.keys(event.identityTokens).length > 0 ? { evento: eventLayer } : {}),
    }),
  ) as CSSProperties;
}
