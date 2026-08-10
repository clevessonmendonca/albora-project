import type { DetalhesItem, Fila, ItemFila } from "@albora/core";

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
 */

const BANCO = "albora-fila";
const VERSAO = 1;
const LOJA = "pendentes";

export class ErroFilaIndisponivel extends Error {
  readonly code = "fila.indisponivel";
  constructor(readonly causa: unknown) {
    super("IndexedDB indisponível neste navegador");
  }
}

export class ErroCotaEsgotada extends Error {
  readonly code = "fila.cota_esgotada";
  constructor() {
    super("sem espaço para enfileirar");
  }
}

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BANCO, VERSAO);
    } catch (e) {
      // Safari em navegação privada lança aqui em vez de devolver erro. O
      // convidado precisa saber disso na entrada, não depois de tirar a foto.
      falha(new ErroFilaIndisponivel(e));
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) {
        const loja = db.createObjectStore(LOJA, { keyPath: "id" });
        loja.createIndex("criadoEm", "criadoEm");
      }
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => falha(new ErroFilaIndisponivel(req.error));
    req.onblocked = () => falha(new ErroFilaIndisponivel("outra aba segurando a versão antiga"));
  });
}

function transacionar<T>(
  modo: IDBTransactionMode,
  executar: (loja: IDBObjectStore, devolve: (v: T) => void) => void,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((ok, falha) => {
        const tx = db.transaction(LOJA, modo);
        let resultado: T;

        tx.oncomplete = () => {
          db.close();
          ok(resultado);
        };
        tx.onabort = () => {
          db.close();
          // QuotaExceededError chega como abort da transação, não como
          // exceção do put. Sem distinguir, "sem espaço" viraria "erro
          // desconhecido" — e a nuance N6.6 manda avisar e subir na hora.
          falha(tx.error?.name === "QuotaExceededError" ? new ErroCotaEsgotada() : tx.error);
        };
        tx.onerror = () => {
          db.close();
          falha(tx.error);
        };

        executar(tx.objectStore(LOJA), (v) => {
          resultado = v;
        });
      }),
  );
}

export const filaWeb: Fila = {
  enfileirar(item: ItemFila): Promise<void> {
    if (!item.id) return Promise.reject(new Error("item sem id"));
    if (!item.eventoId) return Promise.reject(new Error("item sem eventoId"));

    return transacionar<void>("readwrite", (loja) => {
      // `put`, não `add`: reenfileirar o mesmo id depois de uma falha é o
      // caminho normal, e `add` estouraria com ConstraintError.
      loja.put(item);
    });
  },

  listar(): Promise<ItemFila[]> {
    // Pelo índice de criação: a foto mais antiga sobe primeiro, senão um
    // convidado que tira dez fotos vê a primeira ficar para trás.
    return transacionar<ItemFila[]>("readonly", (loja, devolve) => {
      const req = loja.index("criadoEm").getAll();
      req.onsuccess = () => devolve((req.result as ItemFila[]) ?? []);
    });
  },

  remover(id: string): Promise<void> {
    return transacionar<void>("readwrite", (loja) => {
      loja.delete(id);
    });
  },

  marcarTentativa(id: string): Promise<void> {
    return transacionar<void>("readwrite", (loja) => {
      const req = loja.get(id);
      req.onsuccess = () => {
        const item = req.result as ItemFila | undefined;
        // Ler e gravar na MESMA transação: em duas, uma aba concorrente
        // sobrescreveria a contagem e o item nunca alcançaria o teto de
        // tentativas — retentaria para sempre.
        if (item) loja.put({ ...item, tentativas: (item.tentativas ?? 0) + 1 });
      };
    });
  },

  anotar(id: string, detalhes: DetalhesItem): Promise<boolean> {
    // Mesma transação, mesmo motivo do `marcarTentativa`: o drenador pode
    // estar mexendo neste item enquanto o convidado digita a legenda.
    return transacionar<boolean>("readwrite", (loja, devolve) => {
      devolve(false);

      const req = loja.get(id);
      req.onsuccess = () => {
        const item = req.result as ItemFila | undefined;
        if (!item) return;

        loja.put({ ...item, ...detalhes });
        devolve(true);
      };
    });
  },
};

/** Diagnóstico para a tela: quantos itens e quantos bytes esperam. */
export async function resumoDaFila(): Promise<{ itens: number; bytes: number }> {
  const itens = await filaWeb.listar();
  const bytes = itens.reduce(
    (s, i) => s + (i.corpo.tipo === "blob" ? i.corpo.blob.size : i.corpo.bytes),
    0,
  );
  return { itens: itens.length, bytes };
}

export async function limparFila(): Promise<void> {
  return transacionar<void>("readwrite", (loja) => {
    loja.clear();
  });
}
