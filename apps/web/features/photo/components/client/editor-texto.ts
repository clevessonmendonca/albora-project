import type { TextoComposto } from "@albora/core";

/** Composer de texto (spec 020/a): tamanho e posição nascem no centro, arrastados depois. */

export const LIMITE_TEXTO = 80;
export const TAMANHO_PADRAO = 0.09;

/** Texto em branco (ou nulo) equivale a não ter composer aberto. */
export function textoTemConteudo(texto: TextoComposto | null): texto is TextoComposto {
  return !!texto && texto.conteudo.trim() !== "";
}

/** Atualiza conteúdo preservando posição/tamanho existentes; nasce no centro na primeira letra. */
export function comConteudo(texto: TextoComposto | null, conteudo: string): TextoComposto {
  return {
    conteudo: conteudo.slice(0, LIMITE_TEXTO),
    x: texto?.x ?? 0.5,
    y: texto?.y ?? 0.5,
    tamanho: texto?.tamanho ?? TAMANHO_PADRAO,
  };
}
