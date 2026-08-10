import type { CamadaTokens } from "@albora/tokens";

/**
 * Dependência unidirecional: `pack → core`, nunca o contrário.
 *
 * O núcleo importa daqui e o guard de packs reprova o CI. É o que garante o
 * teste de sanidade: trocar o pack de um evento muda toda a UI sem tocar uma
 * linha do núcleo.
 */
export type Pack = {
  id: string;
  /** Todo texto de domínio do produto sai daqui. Nada de string em JSX. */
  vocabulario: Record<string, string>;
  missoes: { id: string; chaveTitulo: string; ordem: number }[];
  tokens?: CamadaTokens;
};

export type ChaveVocabulario = string;

/**
 * Resolve uma chave de vocabulário. Devolve a própria chave se faltar, em vez
 * de string vazia: chave crua na tela é bug visível, tela vazia é bug mudo.
 */
export function texto(pack: Pack, chave: ChaveVocabulario): string {
  return pack.vocabulario[chave] ?? chave;
}
