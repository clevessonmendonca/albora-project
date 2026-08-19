/**
 * O contrato da fila de upload. Uma definição, duas implementações.
 *
 * A web usa IndexedDB; o app Expo usa SQLite mais sistema de arquivos
 * (ADR 0010). O que não pode existir é uma terceira versão da *lógica* —
 * a fila é a fonte da verdade do produto, e duas fontes divergem em silêncio.
 *
 * Os nomes de campo abaixo (`eventoId`, `corpo`, `criadoEm`, `tentativas`,
 * `tipo: "blob" | "arquivo"`) são o schema persistido na fila offline.
 * Renomeá-los esvazia a fila do convidado. Só os símbolos TypeScript mudam.
 */

/**
 * O corpo aceita `Blob` **ou** referência de arquivo.
 *
 * Não é generalização gratuita: o `URLSession` em segundo plano do iOS só
 * continua a transferência se o corpo estiver referenciado a partir de um
 * arquivo. Um `Blob` em IndexedDB não serve, e descobrir isso depois de a
 * fila estar em produção custaria uma migração de dado do convidado.
 */
export type QueueBody =
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
export type QueueDetails = {
  desafioId?: string | null;
  /** Confessionário — chave de vocabulário do pack. */
  promptKey?: string | null;
  legenda?: string | null;
  lugar?: string | null;
};

export type QueueItem = QueueDetails & {
  /** uuid do cliente. É a chave de idempotência do confirm. */
  id: string;
  eventoId: string;
  corpo: QueueBody;
  mime: string;
  /** Miniatura JPEG — thumb da foto ou frame do vídeo; sobe em `/thumb`. */
  thumb?: QueueBody;
  /** @deprecated Preferir `thumb`. Mantido para filas antigas só com vídeo. */
  poster?: QueueBody;
  criadoEm: number;
  tentativas: number;
  /** Instante de captura em epoch ms. Ausente nas filas antigas. */
  capturadaEm?: number;
  /** True só quando `capturadaEm` é parede de EXIF, não instante absoluto. */
  capturadaEmParede?: boolean;
  largura?: number;
  altura?: number;
  /**
   * True quando o composer marcou esta foto como story (spec 020, sub-etapa
   * a). Decidido no momento da captura, como `desafioId` — por isso mora
   * aqui e não em `QueueDetails`. O confirm, não este item, é quem grava a
   * story: o campo só precisa sobreviver ao retry offline até esse ponto.
   */
  story?: boolean;
};

export interface Queue {
  enqueue(item: QueueItem): Promise<void>;
  list(): Promise<QueueItem[]>;
  remove(id: string): Promise<void>;
  markAttempt(id: string): Promise<void>;
  /**
   * Anota um item que ainda está na fila. Devolve `false` quando o item já
   * saiu — aí a anotação é do banco, não da fila, e quem chama decide.
   */
  annotate(id: string, details: QueueDetails): Promise<boolean>;
}

/** Teto de tentativas antes de o item virar falha visível para o convidado. */
export const MAX_ATTEMPTS = 6;

/**
 * Backoff em segundos reais, não em número de tentativas.
 *
 * Num salão com 200 celulares na mesma antena, retry sem espaçamento é o que
 * transforma sinal ruim em sinal nenhum.
 */
export function retryWaitSeconds(attempts: number): number {
  return Math.min(2 ** attempts, 60);
}

export function shouldGiveUp(item: QueueItem): boolean {
  return item.tentativas >= MAX_ATTEMPTS;
}
