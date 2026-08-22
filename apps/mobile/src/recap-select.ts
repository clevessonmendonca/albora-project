import { isVideoMime, prefixoDoEvento } from "@albora/core";
import type { MinhaFotoEnviada } from "./my-photos";

/** Abaixo disto não há recap — compartilhar uma a uma basta. */
export const RECAP_MINIMO = 3;
export const RECAP_MAXIMO = 10;

export type CandidataRecap = {
  id: string;
  chaveFull: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
};

export function pertenceAoEvento(chaveFull: string, eventoId: string): boolean {
  return chaveFull.startsWith(prefixoDoEvento(eventoId));
}

export function elegiveisParaRecap(
  fotos: readonly MinhaFotoEnviada[],
  eventoId: string,
): CandidataRecap[] {
  return fotos
    .filter((f) => f.chaveFull.length > 0)
    .filter((f) => !isVideoMime(f.mime))
    .filter((f) => pertenceAoEvento(f.chaveFull, eventoId))
    .map((f) => ({
      id: f.id,
      chaveFull: f.chaveFull,
      mime: f.mime,
      criadaEm: f.criadaEm,
      reacoes: f.reacoes ?? 0,
    }));
}

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

export function idsDoRecap(
  fotos: readonly MinhaFotoEnviada[],
  eventoId: string,
): string[] {
  return selecionarRecap(elegiveisParaRecap(fotos, eventoId));
}
