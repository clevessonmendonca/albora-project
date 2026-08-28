import type { Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables, type TokenLayer } from "@albora/tokens";

export type FramePalette = {
  bg: string;
  superficie: string;
  ink: string;
  ink2: string;
  acento: string;
  fonteTitulo: string;
  fonteCorpo: string;
};

function fonteCanvas(valor: string, corpo: string): string {
  const limpo = valor.replace(/"/g, "").trim();
  if (limpo.includes("var(--fonte-corpo)")) return corpo.replace(/"/g, "").trim();
  return limpo;
}

/** Paleta da moldura: o mesmo resolvedor da web, do telão e da peça (ADR 0003). */
export function paletteForFrame(
  identityTokens: Record<string, unknown>,
  pack: Pack | undefined,
): FramePalette {
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    ...(pack ? { pack: pack.tokens } : {}),
    ...(Object.keys(identityTokens).length > 0 ? { evento: identityTokens as TokenLayer } : {}),
  });
  const vars = toVariables(tokens);
  const corpo = vars["--fonte-corpo"] ?? ALBORA_BRAND.fontes.corpo;
  const titulo = vars["--fonte-titulo"] ?? ALBORA_BRAND.fontes.titulo;

  return {
    bg: vars["--bg"] ?? ALBORA_BRAND.cores.noite,
    superficie: vars["--superficie"] ?? ALBORA_BRAND.cores.noite,
    ink: vars["--ink"] ?? ALBORA_BRAND.cores.papel,
    ink2: vars["--ink-2"] ?? ALBORA_BRAND.cores.papel,
    acento: vars["--acento"] ?? ALBORA_BRAND.cores.acento,
    fonteTitulo: fonteCanvas(titulo, corpo),
    fonteCorpo: corpo.replace(/"/g, "").trim(),
  };
}
