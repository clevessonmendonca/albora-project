export type MidiaDoReviver = {
  id: string;
  thumb: string;
  /** Quando a foto aconteceu. Cai para a chegada quando a câmera não disse. */
  em: string;
  destacada: boolean;
};

export type MomentoDoPack = { id: string; chaveTitulo: string; chaveDesc: string };

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
  momentos: MomentoDoPack[],
  vocabulario: Record<string, string>,
): CapituloDoReviver[] {
  if (midias.length < MINIMO_POR_CAPITULO || momentos.length === 0) return [];

  const ordenadas = [...midias].sort((a, b) => a.em.localeCompare(b.em));

  const cabem = Math.floor(ordenadas.length / MINIMO_POR_CAPITULO);
  const quantos = Math.max(1, Math.min(cabem, momentos.length, MAXIMO_DE_CAPITULOS));
  const porCapitulo = Math.ceil(ordenadas.length / quantos);

  const capitulos: CapituloDoReviver[] = [];
  for (let i = 0; i < quantos; i += 1) {
    const fatia = ordenadas.slice(i * porCapitulo, (i + 1) * porCapitulo);
    const momento = momentos[i];
    const primeira = fatia[0];
    if (fatia.length === 0 || !momento || !primeira) continue;

    // A capa é uma escolha do casal quando existe uma; senão, o meio do
    // trecho, que representa melhor o capítulo do que a primeira foto.
    const capa =
      fatia.find((m) => m.destacada) ?? fatia[Math.floor(fatia.length / 2)] ?? primeira;

    capitulos.push({
      id: momento.id,
      titulo: vocabulario[momento.chaveTitulo] ?? "",
      descricao: vocabulario[momento.chaveDesc] ?? "",
      em: primeira.em,
      capa,
      fotos: fatia.length,
    });
  }

  return capitulos;
}
