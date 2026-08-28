export const NOME_NEUTRO_DO_TELAO = "Convidado";
export const MAX_NOME_EXIBICAO = 40;
export const MIN_NOME_EXIBICAO = 2;

const LETRA = /\p{L}/u;

export function nomeNeutroDoTelao(atual: string): string {
  const letra = atual.trim().match(LETRA)?.[0];
  if (!letra) return NOME_NEUTRO_DO_TELAO;
  return `${letra.toLocaleUpperCase("pt-BR")}·`;
}

export function validarNomeDeExibicao(nome: string): string | null {
  const limpo = nome.trim();
  if (limpo.length < MIN_NOME_EXIBICAO || limpo.length > MAX_NOME_EXIBICAO) {
    return null;
  }
  return limpo;
}
