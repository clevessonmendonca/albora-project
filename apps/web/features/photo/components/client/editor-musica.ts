import { suggestionLabel } from "@/features/music/lib/suggestion-copy";

/**
 * O sticker de música do composer (spec 020, sub-etapa b): lista as faixas
 * que os convidados já votaram (`music-db`, a mesma fila de `/api/music`) —
 * não inventa uma segunda fonte de sugestão.
 */

export type FaixaVotada = {
  id: string;
  rotulo: string;
};

/**
 * Lê `sugestoes` da resposta de `/api/music`, a mesma forma que
 * `VisibleSuggestion` serializa. Item sem `id` (fila reconstruída sem
 * persistência) ou sem os campos mínimos some da lista em vez de quebrar o
 * sticker — a mesma tolerância de `readSuggestions` em `use-music.ts`.
 */
export function faixasVotadas(sugestoes: unknown): FaixaVotada[] {
  if (!Array.isArray(sugestoes)) return [];

  const out: FaixaVotada[] = [];
  for (const item of sugestoes) {
    if (
      item &&
      typeof item === "object" &&
      typeof item.id === "string" &&
      typeof item.provedor === "string" &&
      typeof item.tipo === "string"
    ) {
      out.push({
        id: item.id,
        rotulo: suggestionLabel({
          provedor: item.provedor,
          tipo: item.tipo,
          titulo: typeof item.titulo === "string" ? item.titulo : null,
          artista: typeof item.artista === "string" ? item.artista : null,
        }),
      });
    }
  }
  return out;
}
