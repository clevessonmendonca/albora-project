export type MidiaDoReviver = {
  id: string;
  thumb: string;
  /** Quando a foto aconteceu. Cai para a chegada quando a câmera não disse. */
  em: string;
  destacada: boolean;
};

export type MomentoDoReviver = { id: string; titulo: string; descricao?: string };

export type CapituloDoReviver = {
  id: string;
  titulo: string;
  descricao: string;
  /** Hora da primeira foto do capítulo, no fuso do evento. */
  em: string;
  capa: MidiaDoReviver;
  fotos: number;
};

/** Abaixo disto o capítulo é um punhado de fotos, não um trecho da noite. */
const MINIMO_POR_CAPITULO = 3;

/** Mais que isto vira slideshow, não narrativa. */
const MAXIMO_DE_CAPITULOS = 6;

/**
 * Divide a noite em capítulos.
 *
 * O arco vem do pack — é ele que sabe que um casamento tem cerimônia e pista,
 * e um aniversário não. O componente não conhece nenhuma dessas palavras.
 *
 * A ordem é a hora em que a foto ACONTECEU, não a hora em que chegou: quem
 * ficou sem sinal sobe no dia seguinte, e ordenar por upload embaralharia a
 * noite inteira.
 */
export function capitulosDoReviver(
  midias: MidiaDoReviver[],
  momentos: MomentoDoReviver[],
): CapituloDoReviver[] {
  if (midias.length < MINIMO_POR_CAPITULO || momentos.length === 0) return [];

  const ordenadas = [...midias].sort((a, b) => a.em.localeCompare(b.em));

  const cabem = Math.floor(ordenadas.length / MINIMO_POR_CAPITULO);
  const quantos = Math.max(1, Math.min(cabem, momentos.length, MAXIMO_DE_CAPITULOS));

  // A sobra se espalha pelos primeiros capítulos. Com `ceil` em fatia fixa, os
  // primeiros engordavam e o resto caía todo no último: 10 fotos em 3 momentos
  // davam [4, 4, 2], e o último furava o mínimo que este arquivo promete.
  const base = Math.floor(ordenadas.length / quantos);
  const sobra = ordenadas.length % quantos;

  const capitulos: CapituloDoReviver[] = [];
  let inicio = 0;
  for (let i = 0; i < quantos; i += 1) {
    const tamanho = base + (i < sobra ? 1 : 0);
    const fatia = ordenadas.slice(inicio, inicio + tamanho);
    inicio += tamanho;
    const momento = momentos[i];
    const primeira = fatia[0];
    if (fatia.length === 0 || !momento || !primeira) continue;

    // A capa é uma escolha do casal quando existe uma; senão, o meio do
    // trecho, que representa melhor o capítulo do que a primeira foto.
    const capa =
      fatia.find((m) => m.destacada) ?? fatia[Math.floor(fatia.length / 2)] ?? primeira;

    capitulos.push({
      id: momento.id,
      titulo: momento.titulo,
      descricao: momento.descricao ?? "",
      em: primeira.em,
      capa,
      fotos: fatia.length,
    });
  }

  return capitulos;
}

/** Da primeira à última foto — não da abertura ao fim do evento, que ninguém fotografa. */
export function tempoJuntoEmHoras(midias: { em: string }[]): number {
  if (midias.length === 0) return 0;
  const tempos = midias.map((m) => new Date(m.em).getTime());
  return Math.round((Math.max(...tempos) - Math.min(...tempos)) / 3_600_000);
}

/**
 * Função pura, sem estado de cliente — mora aqui, não num componente
 * `"use client"`, porque `depois.tsx` é Server Component e não pode chamar
 * uma função que vive do outro lado da fronteira.
 */
export function hora(iso: string, fuso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fuso,
    })
      .format(new Date(iso))
      .replace(":", "h");
  } catch {
    return "";
  }
}
