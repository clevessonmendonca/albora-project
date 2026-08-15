import { votos, type FaixaSugerida } from "@albora/core";
import type { SugestaoVisivel } from "@/features/music/types/sugestao-visivel";

export function filaParaTela(fila: readonly FaixaSugerida[]): SugestaoVisivel[] {
  return fila.map((f) => ({
    provedor: f.link.provedor,
    tipo: f.link.tipo,
    url: f.link.url,
    votos: votos(f),
  }));
}
