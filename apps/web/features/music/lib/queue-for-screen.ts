import { votos, type FaixaSugerida } from "@albora/core";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";

export function queueForScreen(fila: readonly FaixaSugerida[]): VisibleSuggestion[] {
  return fila.map((f) => ({
    // `id` só falta quando a fila vem da reconstrução em memória de
    // `registrarSugestao`, e essa fila nunca chega até aqui — as duas rotas
    // sempre serializam o resultado fresco de `listarSugestoes`. `chave` é o
    // fallback só para não vazar `undefined` no contrato.
    id: f.id ?? f.chave,
    provedor: f.link.provedor,
    tipo: f.link.tipo,
    url: f.link.url,
    votos: votos(f),
    titulo: f.metadado?.titulo ?? null,
    artista: f.metadado?.artista ?? null,
  }));
}
