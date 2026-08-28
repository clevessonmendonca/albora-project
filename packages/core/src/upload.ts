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
  /** ISO do instante de captura; ausente quando o EXIF não trouxe hora. */
  capturadaEm?: string | null;
  legenda?: string | null;
};

/** 10 min: URL vazada não vira link longo; abaixo disso upload de 12 MB em 3G de salão expirava. */
export const VALIDADE_PRESIGN_SEGUNDOS = 600;

export function presignExpirou(resposta: RespostaPresign, agora: number): boolean {
  return agora >= resposta.expiraEm;
}
