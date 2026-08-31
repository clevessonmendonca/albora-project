import { suggestionLabel } from "@/features/music/lib/suggestion-copy";

/** Sticker de música do composer (spec 020/b): faixas votadas de `/api/music`, sem segunda fonte de sugestão. */

export type FaixaVotada = {
  id: string;
  rotulo: string;
};

/** Lê `sugestoes` de `/api/music`; item sem `id` ou campos mínimos some em vez de quebrar o sticker (mesma tolerância de `readSuggestions`). */
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
