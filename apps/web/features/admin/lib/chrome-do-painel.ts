import type { CSSProperties } from "react";
import {
  ALBORA_BRAND,
  resolveTokens,
  toVariables,
  type Background,
  type TokenLayer,
} from "@albora/tokens";

/**
 * A dupla do protótipo do painel. Fica numa camada só do painel: a marca
 * (`ALBORA_BRAND`) continua governando convidado, telão e PDF impresso, e os 46
 * SVGs de `brand/` seguem casando com ela.
 */
export const TIPOGRAFIA_DO_PAINEL: TokenLayer = {
  fontes: {
    titulo: "\"Playfair Display\", Georgia, serif",
    corpo: "\"DM Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
};

/** Admin nasce claro — a marca resolve `dark` (chão do convidado), então o default aqui sobrescreve. O escuro existe e é escolha de quem trabalha, não da marca. */
export function adminVars(background: Background = "light"): CSSProperties {
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      pack: { ...TIPOGRAFIA_DO_PAINEL, background },
    }),
  ) as CSSProperties;
}
