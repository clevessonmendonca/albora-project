/** Hora como unidade de navegação — dá ponto de entrada E fim ao grupo (300 fotos sem grupos não têm onde entrar). */

export type ItemWithTimestamp = { id: string; criadaEm: string | Date };

export type HourGroup<T> = {
  /** Início da hora no fuso local — chave do grupo, não número; festa que passa da meia-noite tem 23h de sábado E 23h de domingo. */
  inicio: Date;
  /** Hora local, 0–23. Só para rótulo. */
  hora: number;
  /** Ordem cronológica crescente — a hora se desenrola, não retrocede. */
  itens: T[];
  /** `false` quando a hora pode receber mais itens (só o grupo mais antigo); tocar grupo incompleto antes de fechar é pior que esperar. */
  completo: boolean;
};

/** Grupos do mais recente para o mais antigo; itens de cada grupo em ordem crescente — opostas de propósito. Item ilegível é descartado. */
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
