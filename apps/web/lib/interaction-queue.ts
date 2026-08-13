/**
 * Fila offline de reações e comentários (spec 008 + 014). Separada da fila de
 * upload: bytes de foto e toques sociais têm ciclos de vida diferentes.
 */

const BANCO = "albora-interacao";
const VERSAO = 2;
const LOJA_REACOES = "reacoes";
const LOJA_COMENTARIOS = "comentarios";

export type ReactionAction =
  | { operacao: "por"; uploadId: string; tipo: string }
  | { operacao: "remover"; uploadId: string };

export type CommentAction = {
  operacao: "publicar";
  id: string;
  uploadId: string;
  texto: string;
  respostaA: string | null;
};

type PendenteReacao = ReactionAction & { id: string; criadoEm: number };
type PendenteComentario = CommentAction & { criadoEm: number };

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(BANCO, VERSAO);
    } catch (e) {
      falha(e);
      return;
    }

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA_REACOES)) {
        db.createObjectStore(LOJA_REACOES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LOJA_COMENTARIOS)) {
        db.createObjectStore(LOJA_COMENTARIOS, { keyPath: "id" });
      }
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => falha(req.error);
  });
}

function transacionar<T>(
  loja: string,
  modo: IDBTransactionMode,
  executar: (store: IDBObjectStore, devolve: (v: T) => void) => void,
): Promise<T> {
  return abrir().then(
    (db) =>
      new Promise<T>((ok, falha) => {
        const tx = db.transaction(loja, modo);
        let resultado: T;

        tx.oncomplete = () => {
          db.close();
          ok(resultado);
        };
        tx.onabort = () => {
          db.close();
          falha(tx.error);
        };
        tx.onerror = () => {
          db.close();
          falha(tx.error);
        };

        executar(tx.objectStore(loja), (v) => {
          resultado = v;
        });
      }),
  );
}

export async function enqueueReaction(acao: ReactionAction): Promise<void> {
  const pendente: PendenteReacao = {
    ...acao,
    id: acao.uploadId,
    criadoEm: Date.now(),
  };

  await transacionar<void>(LOJA_REACOES, "readwrite", (store) => {
    store.put(pendente);
  });
}

export async function listPendingReactions(): Promise<PendenteReacao[]> {
  return transacionar<PendenteReacao[]>(LOJA_REACOES, "readonly", (store, devolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const lista = ((req.result as PendenteReacao[]) ?? []).sort((a, b) => a.criadoEm - b.criadoEm);
      devolve(lista);
    };
  });
}

export async function removePendingReaction(id: string): Promise<void> {
  await transacionar<void>(LOJA_REACOES, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function drainPendingReactions(
  enviar: (acao: ReactionAction) => Promise<boolean>,
): Promise<void> {
  const pendentes = await listPendingReactions();
  for (const item of pendentes) {
    const sucesso = await enviar(item);
    if (sucesso) await removePendingReaction(item.id);
  }
}

export async function enqueueComment(acao: CommentAction): Promise<void> {
  const pendente: PendenteComentario = { ...acao, criadoEm: Date.now() };
  await transacionar<void>(LOJA_COMENTARIOS, "readwrite", (store) => {
    store.put(pendente);
  });
}

export async function listPendingComments(): Promise<PendenteComentario[]> {
  return transacionar<PendenteComentario[]>(LOJA_COMENTARIOS, "readonly", (store, devolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const lista = ((req.result as PendenteComentario[]) ?? []).sort(
        (a, b) => a.criadoEm - b.criadoEm,
      );
      devolve(lista);
    };
  });
}

export async function removePendingComment(id: string): Promise<void> {
  await transacionar<void>(LOJA_COMENTARIOS, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function drainPendingComments(
  enviar: (acao: CommentAction) => Promise<boolean>,
): Promise<void> {
  const pendentes = await listPendingComments();
  for (const item of pendentes) {
    const sucesso = await enviar(item);
    if (sucesso) await removePendingComment(item.id);
  }
}

export async function drainPendingInteractions(opcoes: {
  reacao: (acao: ReactionAction) => Promise<boolean>;
  comentario: (acao: CommentAction) => Promise<boolean>;
}): Promise<void> {
  await drainPendingReactions(opcoes.reacao);
  await drainPendingComments(opcoes.comentario);
}
