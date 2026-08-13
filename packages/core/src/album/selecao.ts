import { agruparEmBlocos, diagramarBloco } from "./blocos";
import { compararCronologicamente } from "./resolver";
import { JANELA_DE_RAJADA_MS } from "./types";
import type { MidiaResolvida, PlanoDoAlbum, Selecao } from "./types";

export function ordemNaRajada(resolvidas: readonly MidiaResolvida[]): Map<string, number> {
  const porSessao = new Map<string, MidiaResolvida[]>();
  for (const midia of resolvidas) {
    const lista = porSessao.get(midia.sessaoId);
    if (lista) lista.push(midia);
    else porSessao.set(midia.sessaoId, [midia]);
  }

  const ordem = new Map<string, number>();
  for (const lista of porSessao.values()) {
    const cronologica = [...lista].sort(compararCronologicamente);
    let indice = 0;
    let anterior: MidiaResolvida | null = null;
    for (const midia of cronologica) {
      if (anterior && midia.em.getTime() - anterior.em.getTime() <= JANELA_DE_RAJADA_MS) {
        indice += 1;
      } else {
        indice = 0;
      }
      ordem.set(midia.id, indice);
      anterior = midia;
    }
  }

  return ordem;
}

export function ordemDeDescarte(resolvidas: readonly MidiaResolvida[]): MidiaResolvida[] {
  const rajada = ordemNaRajada(resolvidas);

  return [...resolvidas].sort((a, b) => {
    const ra = rajada.get(a.id) ?? 0;
    const rb = rajada.get(b.id) ?? 0;
    if (ra !== rb) return rb - ra;
    if (a.reacoes !== b.reacoes) return a.reacoes - b.reacoes;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function selecionarParaAlbum(
  resolvidas: readonly MidiaResolvida[],
  plano: PlanoDoAlbum,
): Selecao {
  const blocos = agruparEmBlocos(resolvidas, plano);
  const fora = new Set<string>();

  const contarPaginas = (): number =>
    blocos.reduce(
      (total, bloco) =>
        total +
        diagramarBloco({ ...bloco, midias: bloco.midias.filter((m) => !fora.has(m.id)) }).length,
      0,
    );

  const porSessao = new Map<string, number>();
  const porCapitulo = new Map<string, number>();
  for (const midia of resolvidas) {
    porSessao.set(midia.sessaoId, (porSessao.get(midia.sessaoId) ?? 0) + 1);
    porCapitulo.set(midia.capituloId, (porCapitulo.get(midia.capituloId) ?? 0) + 1);
  }

  const fila = ordemDeDescarte(resolvidas);
  const descartadas: MidiaResolvida[] = [];

  while (contarPaginas() > plano.tetoDePaginas) {
    const disponivel = (m: MidiaResolvida): boolean => !fora.has(m.id);
    const ultimaDoConvidado = (m: MidiaResolvida): boolean =>
      (porSessao.get(m.sessaoId) ?? 0) <= 1;
    const ultimaDoCapitulo = (m: MidiaResolvida): boolean =>
      (porCapitulo.get(m.capituloId) ?? 0) <= 1;

    const vitima =
      fila.find((m) => disponivel(m) && !ultimaDoConvidado(m) && !ultimaDoCapitulo(m)) ??
      fila.find((m) => disponivel(m) && !ultimaDoCapitulo(m)) ??
      fila.find(disponivel);
    if (!vitima) break;

    fora.add(vitima.id);
    descartadas.push(vitima);
    porSessao.set(vitima.sessaoId, (porSessao.get(vitima.sessaoId) ?? 1) - 1);
    porCapitulo.set(vitima.capituloId, (porCapitulo.get(vitima.capituloId) ?? 1) - 1);
  }

  return {
    mantidas: resolvidas.filter((m) => !fora.has(m.id)),
    descartadas,
  };
}
