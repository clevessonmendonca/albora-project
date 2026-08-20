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

/**
 * `background` sobrepõe o fundo resolvido da cadeia marca → vendor → pack → evento,
 * re-derivando `--bg`/`--ink`/`--acento` etc. Omitido, o comportamento é
 * idêntico ao fundo do evento/pack/vendor/marca.
 */
export function eventVars(event: EventoPublico, background?: Background): CSSProperties {
  const pack = PACKS[event.packId];
  return resolveGuestThemeVariables({
    identityTokens: event.identityTokens,
    vendorBrandTokens: event.vendorBrandTokens,
    ...(pack ? { packTokens: pack.tokens } : {}),
    ...(background !== undefined ? { background } : {}),
  }) as CSSProperties;
}

/**
 * A marca sozinha, sem pack e sem `identityTokens` do evento — o fallback
 * seguro de cada var quando o valor do evento não passa pelo saneador de
 * `theme-style.ts`. Depende só do fundo: a marca é o piso da cadeia de
 * resolução, nunca falta e nunca é dado de terceiro.
 */
export function marcaVars(background: Background): CSSProperties {
  return toVariables(resolveTokens({ marca: ALBORA_BRAND, evento: { background } })) as CSSProperties;
}
