import type { QueueDetails, Queue, QueueItem } from "@albora/core";

/**
 * Adaptador web da fila: IndexedDB direto, sem wrapper.
 *
 * O contrato vive em `@albora/core` e o app Expo terá o seu, sobre SQLite mais
 * sistema de arquivos (ADR 0010). O que não pode existir é uma terceira versão
 * da *lógica* — a fila é a fonte da verdade do produto, e duas fontes divergem
 * em silêncio.
 *
 * Sem biblioteca de abstração por decisão: a fila é a peça que decide a H1,
 * e uma camada a mais entre ela e o navegador é uma camada a mais para
 * comportar-se diferente no Safari de um iPhone de 2019.
 *
 * `DB_NAME` / `STORE` são strings persistidas. Trocar o valor esvazia a fila
 * offline do convidado.
 */

const DB_NAME = "albora-fila";
const VERSION = 1;
const STORE = "pendentes";

export class QueueUnavailableError extends Error {
  readonly code = "fila.indisponivel";
  constructor(readonly causa: unknown) {
    super("IndexedDB indisponível neste navegador");
  }
}

export class QueueQuotaExceededError extends Error {
  readonly code = "fila.cota_esgotada";
  constructor() {
    super("sem espaço para enfileirar");
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, VERSION);
    } catch (e) {
      // Safari em navegação privada lança aqui em vez de devolver erro. O
      // convidado precisa saber disso na entrada, não depois de tirar a foto.
      reject(new QueueUnavailableError(e));
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("criadoEm", "criadoEm");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new QueueUnavailableError(req.error));
    req.onblocked = () => reject(new QueueUnavailableError("outra aba segurando a versão antiga"));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, settle: (v: T) => void) => void,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        let result: T;

        tx.oncomplete = () => {
          db.close();
          resolve(result);
        };
        tx.onabort = () => {
          db.close();
          // QuotaExceededError chega como abort da transação, não como
          // exceção do put. Sem distinguir, "sem espaço" viraria "erro
          // desconhecido" — e a nuance N6.6 manda avisar e subir na hora.
          reject(tx.error?.name === "QuotaExceededError" ? new QueueQuotaExceededError() : tx.error);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };

        run(tx.objectStore(STORE), (v) => {
          result = v;
        });
      }),
  );
}

export const webQueue: Queue = {
  enqueue(item: QueueItem): Promise<void> {
    if (!item.id) return Promise.reject(new Error("item sem id"));
    if (!item.eventoId) return Promise.reject(new Error("item sem eventoId"));

    return withStore<void>("readwrite", (store) => {
      // `put`, não `add`: reenfileirar o mesmo id depois de uma falha é o
      // caminho normal, e `add` estouraria com ConstraintError.
      store.put(item);
    });
  },

  list(): Promise<QueueItem[]> {
    // Pelo índice de criação: a foto mais antiga sobe primeiro, senão um
    // convidado que tira dez fotos vê a primeira ficar para trás.
    return withStore<QueueItem[]>("readonly", (store, settle) => {
      const req = store.index("criadoEm").getAll();
      req.onsuccess = () => settle((req.result as QueueItem[]) ?? []);
    });
  },

  remove(id: string): Promise<void> {
    return withStore<void>("readwrite", (store) => {
      store.delete(id);
    });
  },

  markAttempt(id: string): Promise<void> {
    return withStore<void>("readwrite", (store) => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result as QueueItem | undefined;
        // Ler e gravar na MESMA transação: em duas, uma aba concorrente
        // sobrescreveria a contagem e o item nunca alcançaria o teto de
        // tentativas — retentaria para sempre.
        if (item) store.put({ ...item, tentativas: (item.tentativas ?? 0) + 1 });
      };
    });
  },

  annotate(id: string, details: QueueDetails): Promise<boolean> {
    // Mesma transação, mesmo motivo do `markAttempt`: o drenador pode
    // estar mexendo neste item enquanto o convidado digita a legenda.
    return withStore<boolean>("readwrite", (store, settle) => {
      settle(false);

      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result as QueueItem | undefined;
        if (!item) return;

        store.put({ ...item, ...details });
        settle(true);
      };
    });
  },
};

/** Diagnóstico para a tela: quantos itens e quantos bytes esperam. */
export async function queueSummary(): Promise<{ itens: number; bytes: number }> {
  const items = await webQueue.list();
  const bytes = items.reduce(
    (s, i) => s + (i.corpo.tipo === "blob" ? i.corpo.blob.size : i.corpo.bytes),
    0,
  );
  return { itens: items.length, bytes };
}

export async function clearQueue(): Promise<void> {
  return withStore<void>("readwrite", (store) => {
    store.clear();
  });
}
