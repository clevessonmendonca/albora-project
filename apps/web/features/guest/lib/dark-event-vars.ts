import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { ALBORA_BRAND, toVariables, resolveTokens, type TokenLayer } from "@albora/tokens";
import type { CSSProperties } from "react";

export function darkEventVars(event: EventoPublico): CSSProperties {
  const pack = PACKS[event.packId];

  const vendorLayer =
    event.vendorBrandTokens && Object.keys(event.vendorBrandTokens).length > 0
      ? (event.vendorBrandTokens as TokenLayer)
      : undefined;

  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    ...(vendorLayer ? { vendor: vendorLayer } : {}),
    pack: { ...(pack?.tokens ?? {}), background: "dark" },
  });
  return toVariables(tokens) as CSSProperties;
}
