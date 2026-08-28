import { preset } from "@albora/core";
import type { FiltroAplicado } from "@albora/core";

/** Converte um ID de preset e uma intensidade para o shape que `processarFoto` aceita em `filtro`. Puro e sem side-effects — serve como ponto único de conversão entre a escolha do convidado (string) e o domínio de cor (core). Devolve `undefined` quando `id` não bate com nenhum preset — o chamador decide se usa "sem filtro" ou exibe erro. */
export function filtroFromPreset(id: string, intensidade = 1): FiltroAplicado | undefined {
  const p = preset(id);
  if (!p) return undefined;
  return {
    ajustes: p.ajustes,
    porPixel: p.porPixel ?? false,
    intensidade,
  };
}
