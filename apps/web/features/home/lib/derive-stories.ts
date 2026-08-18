import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

export type StoryCandidate = {
  id: string;
  nome: string;
  chaveThumb: string;
};

/** Tira de stories cabe numa tela; além disso é rolagem sem fim, que o produto evita. */
const LIMITE_STORIES = 12;

/**
 * Deriva "stories por pessoa" das fotos recentes do feed.
 *
 * Não existe hoje um dado dedicado de "participantes com foto recente" — só
 * a lista de uploads. Esta função deriva de forma simples: um item por
 * autor, na ordem em que aparece. O feed já vem do mais novo para o mais
 * velho, então o primeiro item de cada autor é a foto mais recente dele.
 *
 * Antes do gate (`interacao === "espelho"`) o servidor omite `sessaoAutor`
 * (spec 008/014) — o agrupamento cai para o nome, que é o único identificador
 * que resta. Duas pessoas com o mesmo primeiro nome colidem nesse caso; é o
 * preço de derivar sem um id estável, não um bug desta função.
 */
export function deriveStories(itens: readonly ItemVisivel[]): StoryCandidate[] {
  const vistos = new Set<string>();
  const out: StoryCandidate[] = [];

  for (const item of itens) {
    const chave = item.sessaoAutor ?? item.autor;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    out.push({ id: chave, nome: item.autor, chaveThumb: item.chaveThumb });
    if (out.length >= LIMITE_STORIES) break;
  }

  return out;
}
