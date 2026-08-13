import type { EventoPublico } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens, type CamadaTokens } from "@albora/tokens";
import type { CSSProperties } from "react";

export function eventVars(event: EventoPublico): CSSProperties {
  const pack = PACKS[event.packId];
  const eventLayer = event.identityTokens as CamadaTokens;
  return paraVariaveis(
    resolverTokens({
      marca: MARCA_ALBORA,
      ...(pack ? { pack: pack.tokens } : {}),
      ...(Object.keys(event.identityTokens).length > 0 ? { evento: eventLayer } : {}),
    }),
  ) as CSSProperties;
}
