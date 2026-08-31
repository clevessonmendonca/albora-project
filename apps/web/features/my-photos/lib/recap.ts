import { isVideoMime, prefixoDoEvento } from "@albora/core";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/** Seleção do recap A2: fotos do próprio convidado neste evento ordenadas por engajamento+recência, sem curadoria por IA. */

/** Abaixo disto não há recap: um carrossel de 1–2 fotos é igual a compartilhar cada uma direto. */
export const RECAP_MINIMO = 3;
/** A partir daqui o recap já entrega o que a spec pede ("6–10 melhores"). */
export const RECAP_IDEAL_MINIMO = 6;
/** Teto do carrossel — também o teto de arquivos que a Web Share API aceita com folga. */
export const RECAP_MAXIMO = 10;

export type CandidataRecap = {
  id: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
};

/** Segunda barreira: chave deve começar em `events/{event_id}/...` — item de outro evento (bug upstream, cache errado) não entra no recap. */
export function pertenceAoEvento(chaveFull: string, eventoId: string): boolean {
  return chaveFull.startsWith(prefixoDoEvento(eventoId));
}

/** Candidatas ao recap: só foto (nunca vídeo — imagem pronta para o story), com chave de mídia, do evento corrente. */
export function elegiveisParaRecap(
  itens: readonly ItemVisivel[],
  eventoId: string,
): CandidataRecap[] {
  return itens
    .filter((item) => item.chaveFull.length > 0)
    .filter((item) => !isVideoMime(item.mime))
    .filter((item) => pertenceAoEvento(item.chaveFull, eventoId))
    .map((item) => ({
      id: item.id,
      chaveFull: item.chaveFull,
      mime: item.mime,
      criadaEm: item.criadaEm,
      reacoes: item.reacoes ?? 0,
    }));
}

/** Ordena por reação (sem IA, ADR 0007), empatado pela mais recente; corta em `RECAP_MAXIMO`. Devolve `[]` abaixo de `RECAP_MINIMO` — a tela decide não mostrar o convite. */
export function selecionarRecap(candidatas: readonly CandidataRecap[]): string[] {
  if (candidatas.length < RECAP_MINIMO) return [];

  return [...candidatas]
    .sort((a, b) => {
      if (b.reacoes !== a.reacoes) return b.reacoes - a.reacoes;
      return new Date(b.criadaEm).getTime() - new Date(a.criadaEm).getTime();
    })
    .slice(0, RECAP_MAXIMO)
    .map((c) => c.id);
}

/** Composição das duas funções acima — o que as telas realmente chamam. */
export function idsDoRecap(itens: readonly ItemVisivel[], eventoId: string): string[] {
  return selecionarRecap(elegiveisParaRecap(itens, eventoId));
}
