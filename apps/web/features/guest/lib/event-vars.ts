import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import {
  ALBORA_BRAND,
  toVariables,
  resolveTokens,
  type Background,
  type TokenLayer,
} from "@albora/tokens";
import type { CSSProperties } from "react";

/**
 * `background` sobrepõe o fundo resolvido da cadeia marca → pack → evento,
 * re-derivando `--bg`/`--ink`/`--acento` etc. Omitido, o comportamento é
 * idêntico ao fundo do evento/pack/marca.
 */
export function eventVars(event: EventoPublico, background?: Background): CSSProperties {
  const pack = PACKS[event.packId];
  const eventLayer = event.identityTokens as TokenLayer;
  const hasEventLayer = Object.keys(event.identityTokens).length > 0;
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      ...(pack ? { pack: pack.tokens } : {}),
      ...(hasEventLayer || background
        ? { evento: { ...(hasEventLayer ? eventLayer : {}), ...(background ? { background } : {}) } }
        : {}),
    }),
  ) as CSSProperties;
}
