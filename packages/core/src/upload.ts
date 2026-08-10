/**
 * O contrato do pipeline de upload. Compartilhado pelas duas superfícies.
 */

export type PedidoPresign = {
  mime: string;
  bytes: number;
  largura: number;
  altura: number;
  /** uuid do cliente. É a chave de idempotência do confirm. */
  uploadId: string;
  desafioId?: string | null;
};

export type RespostaPresign = {
  uploadId: string;
  /** Derivada no servidor. O cliente recebe, nunca escolhe. */
  chave: string;
  full: string;
  thumb: string;
  expiraEm: number;
};

export type PedidoConfirm = {
  uploadId: string;
  chave: string;
  largura: number;
  altura: number;
  legenda?: string | null;
};

/**
 * Validade da assinatura.
 *
 * Curta o suficiente para uma URL vazada não valer nada por muito tempo, e
 * longa o suficiente para um upload de 12 MB terminar num 3G de salão de
 * festas. Dez minutos é o meio-termo; abaixo disso a fila offline começa a
 * apresentar URL expirada como falha de upload.
 */
export const VALIDADE_PRESIGN_SEGUNDOS = 600;

export function presignExpirou(resposta: RespostaPresign, agora: number): boolean {
  return agora >= resposta.expiraEm;
}
