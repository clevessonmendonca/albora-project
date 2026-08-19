import { isVideoMime, prefixoDoEvento } from "@albora/core";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/**
 * A seleção do recap (spec de crescimento A2): as fotos do PRÓPRIO convidado,
 * DESTE evento, que melhor representam a noite — aqui, engajamento (reação) e
 * recência, sem curadoria por IA.
 *
 * Fica fora de `@albora/core` de propósito: esta task não edita `packages/**`.
 * Se a mesma regra precisar valer para o app nativo um dia, o lugar certo para
 * subir é o pacote — não duplicar às pressas aqui.
 */

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

/**
 * Segunda barreira, redundante com o filtro que a rota do servidor já aplica:
 * toda chave deste evento começa em `events/{event_id}/...` (`derivarChaveMidia`
 * em `packages/core/src/chaves.ts`). Um item que chegasse aqui de outro evento —
 * bug upstream, resposta de cache errada — não entra no recap mesmo assim.
 */
export function pertenceAoEvento(chaveFull: string, eventoId: string): boolean {
  return chaveFull.startsWith(prefixoDoEvento(eventoId));
}

/**
 * As candidatas ao recap: só foto (nunca vídeo — o recap é imagem pronta para
 * o story), com chave de mídia, e do evento corrente.
 */
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

/**
 * Ordena por reação — o sinal de "melhor" que o produto já tem, sem curadoria
 * por IA (ADR 0007) — e, empatado, pela mais recente. Corta em `RECAP_MAXIMO`.
 *
 * Devolve `[]` abaixo de `RECAP_MINIMO`: sem fotos suficientes, não há recap
 * para oferecer, e a tela que chama isto decide não mostrar o convite.
 */
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
