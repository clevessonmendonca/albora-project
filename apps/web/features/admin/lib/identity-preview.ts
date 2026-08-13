import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CamadaTokens } from "@albora/tokens";
import type { Pack } from "@albora/packs";
import type { CSSProperties } from "react";

export const identityPreviewClassName =
  "rounded-token bg-bg p-5 font-corpo text-ink";

export function presetSwatchProps(color: string): {
  className: string;
  style: CSSProperties;
} {
  return {
    className: "size-7 shrink-0 rounded-full bg-[var(--preset-swatch)]",
    style: { "--preset-swatch": color } as CSSProperties,
  };
}

export function resolveIdentityPreviewVars(
  pack: Pack,
  identityTokens: Record<string, unknown>,
): CSSProperties {
  return paraVariaveis(
    resolverTokens({
      marca: MARCA_ALBORA,
      ...(pack.tokens ? { pack: pack.tokens } : {}),
      evento: identityTokens as CamadaTokens,
    }),
  ) as CSSProperties;
}
