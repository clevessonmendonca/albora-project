import { CAPITULO_UNICO } from "./types";
import type { MidiaResolvida } from "./types";

/** Três cabem na mão, no celular, em pé. Mais que isso deixa de ser resumo e vira o álbum de novo. */
export const POR_MOMENTO = 3;

/** Com três vagas, deixar uma pessoa levar todas apagaria a festa dos outros do momento. Duas é o teto — a terceira vaga fica para quem mais ninguém viu. */
const POR_PESSOA = 2;

export type MomentoDaRetrospectiva = {
  id: string;
  comecaEm: Date | null;
  midias: MidiaResolvida[];
};

export type Retrospectiva = {
  momentos: MomentoDaRetrospectiva[];
  /** Alias de leitura para quem pensa em capítulo; é a mesma lista. */
  capitulos: MomentoDaRetrospectiva[];
  /** Uma noite que não se divide em momentos vira sequência, e a tela diz isso. */
  sequenciaUnica: boolean;
  total: number;
};

/** Destaque do casal ganha de reação de convidado; entre iguais, a mais reagida; e o id desempata para a ordem não mudar entre dois carregamentos. */
function porCuradoria(a: MidiaResolvida, b: MidiaResolvida): number {
  const destaque = Number(b.destacada ?? false) - Number(a.destacada ?? false);
  if (destaque !== 0) return destaque;

  const reacoes = b.reacoes - a.reacoes;
  if (reacoes !== 0) return reacoes;

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Duas passadas: a primeira respeita o teto por pessoa, a segunda preenche o que sobrou. Sem a segunda, um momento fotografado por uma pessoa só ficaria com buraco. */
function escolherDoMomento(midias: readonly MidiaResolvida[]): MidiaResolvida[] {
  const candidatas = [...midias].sort(porCuradoria);
  const escolhidas: MidiaResolvida[] = [];
  const porSessao = new Map<string, number>();

  for (const m of candidatas) {
    if (escolhidas.length >= POR_MOMENTO) break;
    const jaTem = porSessao.get(m.sessaoId) ?? 0;
    if (jaTem >= POR_PESSOA) continue;
    escolhidas.push(m);
    porSessao.set(m.sessaoId, jaTem + 1);
  }

  for (const m of candidatas) {
    if (escolhidas.length >= POR_MOMENTO) break;
    if (escolhidas.includes(m)) continue;
    escolhidas.push(m);
  }

  return escolhidas;
}

function maisCedo(midias: readonly MidiaResolvida[]): Date | null {
  let menor: Date | null = null;
  for (const m of midias) {
    if (!menor || m.em.getTime() < menor.getTime()) menor = m.em;
  }
  return menor;
}

export function montarRetrospectiva(midias: readonly MidiaResolvida[]): Retrospectiva {
  if (midias.length === 0) {
    return { momentos: [], capitulos: [], sequenciaUnica: false, total: 0 };
  }

  const porCapitulo = new Map<string, MidiaResolvida[]>();
  for (const m of midias) {
    const desta = porCapitulo.get(m.capituloId);
    if (desta) desta.push(m);
    else porCapitulo.set(m.capituloId, [m]);
  }

  const sequenciaUnica = porCapitulo.size < 2;

  const momentos: MomentoDaRetrospectiva[] = sequenciaUnica
    ? [
        {
          id: CAPITULO_UNICO,
          comecaEm: maisCedo(midias),
          midias: escolherDoMomento(midias),
        },
      ]
    : [...porCapitulo.entries()]
        .map(([id, doCapitulo]) => ({
          id,
          comecaEm: maisCedo(doCapitulo),
          midias: escolherDoMomento(doCapitulo),
        }))
        .sort((a, b) => (a.comecaEm?.getTime() ?? 0) - (b.comecaEm?.getTime() ?? 0));

  return {
    momentos,
    capitulos: momentos,
    sequenciaUnica,
    total: momentos.reduce((n, m) => n + m.midias.length, 0),
  };
}
