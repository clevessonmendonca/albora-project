import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { CSSProperties } from "react";

export function darkEventVars(event: EventoPublico): CSSProperties {
  const pack = PACKS[event.packId];
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...(pack?.tokens ?? {}), background: "dark" },
  });
  return toVariables(tokens) as CSSProperties;
}
