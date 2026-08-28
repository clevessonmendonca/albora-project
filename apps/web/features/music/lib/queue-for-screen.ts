import { votos, type FaixaSugerida } from "@albora/core";
import type { VisibleSuggestion } from "@/features/music/types/visible-suggestion";

export function queueForScreen(fila: readonly FaixaSugerida[]): VisibleSuggestion[] {
  return fila.map((f) => ({
    // `id` só falta na fila reconstruída em memória de `registrarSugestao`, que nunca chega até aqui (ambas as rotas serializam `listarSugestoes` fresco) — `chave` é fallback pra não vazar `undefined`.
    id: f.id ?? f.chave,
    provedor: f.link.provedor,
    tipo: f.link.tipo,
    url: f.link.url,
    votos: votos(f),
    titulo: f.metadado?.titulo ?? null,
    artista: f.metadado?.artista ?? null,
  }));
}
