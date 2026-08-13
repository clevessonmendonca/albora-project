import { CAPITULO_SEM_HORA, CAPITULO_UNICO } from "./tempo";
import { escolherLayout, LAYOUT_DE_UMA, MAIOR_LAYOUT, proporcaoDe } from "./slots";
import type { Bloco, FotoNaPagina, MidiaResolvida, Pagina, PlanoDoAlbum } from "./types";

export function agruparEmBlocos(
  resolvidas: readonly MidiaResolvida[],
  plano: PlanoDoAlbum,
): Bloco[] {
  const porChave = new Map<string, Bloco>();

  for (const midia of resolvidas) {
    const chave = [
      midia.capituloId,
      midia.inicioDaHora?.getTime() ?? "sem-hora",
      midia.lugarId ?? "sem-lugar",
    ].join("|");

    const existente = porChave.get(chave);
    if (existente) {
      existente.midias.push(midia);
      continue;
    }

    porChave.set(chave, {
      capituloId: midia.capituloId,
      inicioDaHora: midia.inicioDaHora,
      hora: midia.hora,
      amanhecer: midia.amanhecer,
      lugarId: midia.lugarId,
      midias: [midia],
    });
  }

  const ordemDoCapitulo = new Map<string, number>();
  plano.capitulos.forEach((c, i) => ordemDoCapitulo.set(c.id, i));
  ordemDoCapitulo.set(CAPITULO_UNICO, ordemDoCapitulo.get(CAPITULO_UNICO) ?? -1);
  const FIM = Number.MAX_SAFE_INTEGER;

  return [...porChave.values()].sort((a, b) => {
    const ia = a.capituloId === CAPITULO_SEM_HORA ? FIM : ordemDoCapitulo.get(a.capituloId) ?? 0;
    const ib = b.capituloId === CAPITULO_SEM_HORA ? FIM : ordemDoCapitulo.get(b.capituloId) ?? 0;
    if (ia !== ib) return ia - ib;

    const ta = a.inicioDaHora?.getTime() ?? 0;
    const tb = b.inicioDaHora?.getTime() ?? 0;
    if (ta !== tb) return ta - tb;

    const la = a.lugarId ?? "";
    const lb = b.lugarId ?? "";
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
}

export function diagramarBloco(bloco: Bloco): Pagina[] {
  const paginas: Pagina[] = [];
  let i = 0;

  while (i < bloco.midias.length) {
    const prefixo = bloco.midias.slice(i, i + MAIOR_LAYOUT);
    const primeira = prefixo[0];
    if (!primeira) break;

    const layout = escolherLayout(prefixo) ?? LAYOUT_DE_UMA[proporcaoDe(primeira)];

    const fotos: FotoNaPagina[] = [];
    for (const [k, slot] of layout.slots.entries()) {
      const midia = prefixo[k];
      if (midia) fotos.push({ slot, midia });
    }

    paginas.push({
      capituloId: bloco.capituloId,
      layoutId: layout.id,
      inicioDaHora: bloco.inicioDaHora,
      hora: bloco.hora,
      amanhecer: bloco.amanhecer,
      lugarId: bloco.lugarId,
      fotos,
    });

    i += fotos.length;
  }

  return paginas;
}
