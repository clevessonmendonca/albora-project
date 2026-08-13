/**
 * A hora é a unidade que a pessoa escolhe nos stories.
 *
 * Escolher "23h" é escolher um trecho da noite que ela viveu — chegou, dançou,
 * brindou. Uma lista contínua de trezentas fotos não tem onde a pessoa entrar,
 * e por isso ela não entra: rola um pouco e sai. A hora dá o ponto de entrada e,
 * mais importante, dá o **fim** — o grupo acaba, e é aí que o caminho de volta
 * para a câmera aparece.
 */

export type ItemWithTimestamp = { id: string; criadaEm: string | Date };

export type HourGroup<T> = {
  /**
   * Início da hora, no fuso do aparelho. É a chave do grupo, e não o número da
   * hora: uma festa que passa da meia-noite tem 23h de sábado e 23h de domingo,
   * e juntar as duas embaralharia a noite inteira.
   */
  inicio: Date;
  /** Hora local, 0–23. Só para rótulo. */
  hora: number;
  /** Ordem cronológica crescente — a hora se desenrola, não retrocede. */
  itens: T[];
  /**
   * `false` quando ainda há página por carregar e esta hora pode receber itens.
   *
   * Só o grupo mais antigo pode estar incompleto: o feed entrega do mais novo
   * para o mais velho, então toda hora acima dela já veio inteira. Quem toca um
   * grupo incompleto precisa fechá-lo antes de exibir — começar no meio da hora
   * e ver a fila reordenar embaixo do dedo é pior que esperar.
   */
  completo: boolean;
};

/**
 * Agrupa por hora. Grupos do mais recente para o mais antigo; itens de cada
 * grupo em ordem crescente.
 *
 * A ordem dos grupos e a ordem dentro do grupo são opostas de propósito. A
 * pessoa quer entrar no que acabou de acontecer — daí o grupo mais recente
 * primeiro. Dentro da hora, ela quer a hora acontecendo na ordem em que
 * aconteceu.
 *
 * Item com instante ilegível é descartado, e não agrupado sob uma chave `NaN`
 * que engoliria todos os outros defeituosos no mesmo balde.
 */
export function groupByHour<T extends ItemWithTimestamp>(
  itens: readonly T[],
  opcoes: { temMais: boolean },
): HourGroup<T>[] {
  const ordenados: { item: T; em: Date }[] = [];

  for (const item of itens) {
    const em = paraInstante(item.criadaEm);
    if (em) ordenados.push({ item, em });
  }

  ordenados.sort((a, b) => a.em.getTime() - b.em.getTime());

  const grupos: HourGroup<T>[] = [];

  for (const { item, em } of ordenados) {
    const inicio = inicioDaHora(em);
    const ultimo = grupos[grupos.length - 1];

    if (ultimo && ultimo.inicio.getTime() === inicio.getTime()) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ inicio, hora: inicio.getHours(), itens: [item], completo: true });
    }
  }

  const maisAntigo = grupos[0];
  if (maisAntigo && opcoes.temMais) maisAntigo.completo = false;

  return grupos.reverse();
}

/** `23h`. Numeral arábico porque hora é quantidade real, não numeração de missão. */
export function hourLabel(hora: number): string {
  return `${String(hora).padStart(2, "0")}h`;
}

function paraInstante(bruto: string | Date): Date | null {
  const em = bruto instanceof Date ? bruto : new Date(bruto);
  return Number.isNaN(em.getTime()) ? null : em;
}

function inicioDaHora(em: Date): Date {
  const inicio = new Date(em.getTime());
  inicio.setMinutes(0, 0, 0);
  return inicio;
}
