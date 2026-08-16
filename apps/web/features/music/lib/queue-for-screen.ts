import { votos, type FaixaSugerida } from "@albora/core";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";

export function queueForScreen(fila: readonly FaixaSugerida[]): VisibleSuggestion[] {
  return fila.map((f) => ({
    provedor: f.link.provedor,
    tipo: f.link.tipo,
    url: f.link.url,
    votos: votos(f),
    titulo: f.metadado?.titulo ?? null,
    artista: f.metadado?.artista ?? null,
  }));
}
