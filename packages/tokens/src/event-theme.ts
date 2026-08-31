import { ALBORA_BRAND } from "./marca";
import { toVariables } from "./outputs";
import { resolveTokens } from "./resolver";
import type { Background, TokenLayer } from "./types";

/** Remove `fundo`/`background` da camada — usado quando o argumento explícito decide o fundo. */
function semFundoDaCamada(layer: TokenLayer): Omit<TokenLayer, "fundo" | "background"> {
  const { fundo: _fundo, background: _background, ...resto } = layer;
  return resto;
}

export type GuestThemeInput = {
  identityTokens: Record<string, unknown>;
  vendorBrandTokens?: Record<string, unknown> | null;
  packTokens?: TokenLayer | undefined;
  background?: Background | undefined;
};

/** Cadeia marca → vendor → pack → evento para CSS variables — um resolvedor, dois renderizadores (ADR 0003). */
export function resolveGuestThemeVariables(input: GuestThemeInput): Record<string, string> {
  const identityLayer = input.identityTokens as TokenLayer;
  const hasIdentityLayer = Object.keys(input.identityTokens).length > 0;

  const eventoLayer: TokenLayer | undefined = input.background
    ? { ...semFundoDaCamada(identityLayer), background: input.background }
    : hasIdentityLayer
      ? identityLayer
      : undefined;

  const vendorLayer =
    input.vendorBrandTokens && Object.keys(input.vendorBrandTokens).length > 0
      ? (input.vendorBrandTokens as TokenLayer)
      : undefined;

  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      ...(vendorLayer ? { vendor: vendorLayer } : {}),
      ...(input.packTokens ? { pack: input.packTokens } : {}),
      ...(eventoLayer ? { evento: eventoLayer } : {}),
    }),
  );
}
