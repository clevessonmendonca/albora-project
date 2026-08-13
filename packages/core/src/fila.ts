/**
 * O contrato da fila de upload. Uma definição, duas implementações.
 *
 * A web usa IndexedDB; o app Expo usa SQLite mais sistema de arquivos
 * (ADR 0010). O que não pode existir é uma terceira versão da *lógica* —
 * a fila é a fonte da verdade do produto, e duas fontes divergem em silêncio.
 */

/**
 * O corpo aceita `Blob` **ou** referência de arquivo.
 *
 * Não é generalização gratuita: o `URLSession` em segundo plano do iOS só
 * continua a transferência se o corpo estiver referenciado a partir de um
 * arquivo. Um `Blob` em IndexedDB não serve, e descobrir isso depois de a
 * fila estar em produção custaria uma migração de dado do convidado.
 */
export type CorpoItem =
  | { tipo: "blob"; blob: Blob }
  | { tipo: "arquivo"; caminho: string; bytes: number };

/**
 * O que o convidado escreve **depois** de a subida começar (§3.6).
 *
 * Mora no item da fila, e não numa chamada à parte, porque enquanto a foto
 * está pendente não existe linha no banco para anotar. `lugar` é id de lista
 * fechada do pack, nunca texto livre e nunca coordenada — reintroduzir
 * localização aqui desfaria a remoção de EXIF da 004 (N6.9).
 */
export type DetalhesItem = {
  desafioId?: string | null;
  legenda?: string | null;
  lugar?: string | null;
};

export type ItemFila = DetalhesItem & {
  /** uuid do cliente. É a chave de idempotência do confirm. */
  id: string;
  eventoId: string;
  corpo: CorpoItem;
  mime: string;
  /** Miniatura JPEG — thumb da foto ou frame do vídeo; sobe em `/thumb`. */
  thumb?: CorpoItem;
  /** @deprecated Preferir `thumb`. Mantido para filas antigas só com vídeo. */
  poster?: CorpoItem;
  criadoEm: number;
  tentativas: number;
};

export interface Fila {
  enfileirar(item: ItemFila): Promise<void>;
  listar(): Promise<ItemFila[]>;
  remover(id: string): Promise<void>;
  marcarTentativa(id: string): Promise<void>;
  /**
   * Anota um item que ainda está na fila. Devolve `false` quando o item já
   * saiu — aí a anotação é do banco, não da fila, e quem chama decide.
   */
  anotar(id: string, detalhes: DetalhesItem): Promise<boolean>;
}

/** Teto de tentativas antes de o item virar falha visível para o convidado. */
export const MAX_TENTATIVAS = 6;

/**
 * Backoff em segundos reais, não em número de tentativas.
 *
 * Num salão com 200 celulares na mesma antena, retry sem espaçamento é o que
 * transforma sinal ruim em sinal nenhum.
 */
export function esperaAntesDeRetentar(tentativas: number): number {
  return Math.min(2 ** tentativas, 60);
}

export function deveDesistir(item: ItemFila): boolean {
  return item.tentativas >= MAX_TENTATIVAS;
}
