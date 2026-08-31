import { modoInteracao, type GateDeInteracao } from "../interacao";
import { TETO_DE_SUGESTOES_POR_SESSAO } from "./types";
import type { FaixaSugerida, LinkDeMusica, ResultadoDaSugestao } from "./types";

export function chaveDaFaixa(link: LinkDeMusica): string {
  return `${link.provedor}:${link.tipo}:${link.identificador}`;
}

export function votos(faixa: FaixaSugerida): number {
  return faixa.sessoes.length;
}

export function podeSugerir(evento: GateDeInteracao, agora: Date): boolean {
  return modoInteracao(evento, agora) === "completo";
}

export function sugestoesDaSessao(
  fila: readonly FaixaSugerida[],
  sessaoId: string,
): number {
  return fila.filter((f) => f.sessoes[0] === sessaoId).length;
}

export function registrarSugestao(
  fila: readonly FaixaSugerida[],
  sugestao: { sessaoId: string; link: LinkDeMusica },
  evento: GateDeInteracao,
  agora: Date,
): ResultadoDaSugestao {
  if (!podeSugerir(evento, agora)) {
    return { ok: false, erro: { code: "musica.interacao_fechada", details: {} } };
  }

  const chave = chaveDaFaixa(sugestao.link);
  const jaExiste = fila.some((f) => f.chave === chave);

  if (!jaExiste && sugestoesDaSessao(fila, sugestao.sessaoId) >= TETO_DE_SUGESTOES_POR_SESSAO) {
    return {
      ok: false,
      erro: {
        code: "musica.teto_de_sugestoes",
        details: { teto: TETO_DE_SUGESTOES_POR_SESSAO },
      },
    };
  }

  const existente = fila.find((f) => f.chave === chave);

  if (existente === undefined) {
    return {
      ok: true,
      fila: [
        ...fila,
        {
          chave,
          link: sugestao.link,
          sessoes: [sugestao.sessaoId],
          primeiroEm: agora.getTime(),
        },
      ],
    };
  }

  if (existente.sessoes.includes(sugestao.sessaoId)) {
    return { ok: true, fila: [...fila] };
  }

  return {
    ok: true,
    fila: fila.map((f) =>
      f.chave === chave ? { ...f, sessoes: [...f.sessoes, sugestao.sessaoId] } : f,
    ),
  };
}

export function ordenarSugestoes(fila: readonly FaixaSugerida[]): FaixaSugerida[] {
  return [...fila].sort((a, b) => votos(b) - votos(a) || a.primeiroEm - b.primeiroEm);
}
