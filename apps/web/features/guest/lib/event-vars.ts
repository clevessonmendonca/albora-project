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
 * `background` sobrepõe o fundo resolvido da cadeia marca → vendor → pack → evento,
 * re-derivando `--bg`/`--ink`/`--acento` etc. Omitido, o comportamento é
 * idêntico ao fundo do evento/pack/vendor/marca.
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

  const vendorLayer =
    event.vendorBrandTokens && Object.keys(event.vendorBrandTokens).length > 0
      ? (event.vendorBrandTokens as TokenLayer)
      : undefined;

  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      ...(vendorLayer ? { vendor: vendorLayer } : {}),
      ...(pack ? { pack: pack.tokens } : {}),
      ...(eventoLayer ? { evento: eventoLayer } : {}),
    }),
  ) as CSSProperties;
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
