/** Nomes de campo (`eventoId`, `corpo`, `criadoEm`, `tentativas`, `tipo`) são schema persistido. Renomeá-los esvazia a fila offline do convidado. */

/** Blob ou referência de arquivo — iOS URLSession em segundo plano exige arquivo; Blob não continua depois que o app vai ao fundo. */
export type QueueBody =
  | { tipo: "blob"; blob: Blob }
  | { tipo: "arquivo"; caminho: string; bytes: number };

/** `lugar` é id de lista fechada do pack, nunca coordenada — reintroduzir localização aqui desfaria a remoção de EXIF. */
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
  /** Decidido na captura, como `desafioId` — fica aqui, não em `QueueDetails`. O confirm grava; este campo só precisa sobreviver ao retry. */
  story?: boolean;
  /** Mesma lógica de `story`. Sem `story: true` não tem efeito — música é atributo da story, não da foto. */
  musicTrackId?: string | null;
};

export interface Queue {
  enqueue(item: QueueItem): Promise<void>;
  list(): Promise<QueueItem[]>;
  remove(id: string): Promise<void>;
  markAttempt(id: string): Promise<void>;
  /** `false` quando o item já saiu da fila — a anotação cabe ao banco, e quem chama decide. */
  annotate(id: string, details: QueueDetails): Promise<boolean>;
}

/** Teto de tentativas antes de o item virar falha visível para o convidado. */
export const MAX_ATTEMPTS = 6;

/** Backoff exponencial — salão com 200 celulares na mesma antena: retry sem espaçamento transforma sinal ruim em sinal nenhum. */
export function retryWaitSeconds(attempts: number): number {
  return Math.min(2 ** attempts, 60);
}

export function shouldGiveUp(item: QueueItem): boolean {
  return item.tentativas >= MAX_ATTEMPTS;
}
