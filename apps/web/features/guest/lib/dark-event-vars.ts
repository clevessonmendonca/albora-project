import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";

export function darkEventVars(event: EventoPublico): CSSProperties {
  const pack = PACKS[event.packId];
  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...(pack?.tokens ?? {}), fundo: "escuro" },
  });
  return paraVariaveis(tokens) as CSSProperties;
}
