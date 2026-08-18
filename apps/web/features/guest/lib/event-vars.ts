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

/** Remove `fundo`/`background` da camada — usado quando o argumento explícito vai decidir o fundo. */
function semFundoDaCamada(layer: TokenLayer): Omit<TokenLayer, "fundo" | "background"> {
  const { fundo: _fundo, background: _background, ...resto } = layer;
  return resto;
}

/**
 * `background` sobrepõe o fundo resolvido da cadeia marca → pack → evento,
 * re-derivando `--bg`/`--ink`/`--acento` etc. Omitido, o comportamento é
 * idêntico ao fundo do evento/pack/marca.
 */
export function eventVars(event: EventoPublico, background?: Background): CSSProperties {
  const pack = PACKS[event.packId];
  const identityLayer = event.identityTokens as TokenLayer;
  const hasIdentityLayer = Object.keys(event.identityTokens).length > 0;

  // Com `background` presente, ele é a única fonte do fundo desta camada —
  // `fundo`/`background` do identityTokens do evento são removidos antes de
  // aplicar o override, para não coexistirem e decidir por ordem de chave.
  const eventoLayer: TokenLayer | undefined = background
    ? { ...semFundoDaCamada(identityLayer), background }
    : hasIdentityLayer
      ? identityLayer
      : undefined;

  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      ...(pack ? { pack: pack.tokens } : {}),
      ...(eventoLayer ? { evento: eventoLayer } : {}),
    }),
  ) as CSSProperties;
}
