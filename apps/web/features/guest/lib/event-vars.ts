import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  resolveGuestThemeVariables,
  resolveTokens,
  toVariables,
  type Background,
} from "@albora/tokens";
import type { CSSProperties } from "react";

/** `background` sobrepõe o fundo da cadeia marca → vendor → pack → evento, re-derivando `--bg`/`--ink`/`--acento`. Omitido, usa o fundo do evento. */
export function eventVars(event: EventoPublico, background?: Background): CSSProperties {
  const pack = PACKS[event.packId];
  return resolveGuestThemeVariables({
    identityTokens: event.identityTokens,
    vendorBrandTokens: event.vendorBrandTokens,
    ...(pack ? { packTokens: pack.tokens } : {}),
    ...(background !== undefined ? { background } : {}),
  }) as CSSProperties;
}

/** Fallback seguro da marca pura (sem pack/evento) — piso da cadeia de resolução, nunca dado de terceiro. */
export function marcaVars(background: Background): CSSProperties {
  return toVariables(resolveTokens({ marca: ALBORA_BRAND, evento: { background } })) as CSSProperties;
}
