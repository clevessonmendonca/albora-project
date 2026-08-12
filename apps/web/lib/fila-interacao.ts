/**
 * Fila offline de reações e comentários (spec 008 + 014). Separada da fila de
 * upload: bytes de foto e toques sociais têm ciclos de vida diferentes.
 */

const BANCO = "albora-interacao";
const VERSAO = 2;
const LOJA_REACOES = "reacoes";
const LOJA_COMENTARIOS = "comentarios";

export type AcaoReacao =
  | { operacao: "por"; uploadId: string; tipo: string }
  | { operacao: "remover"; uploadId: string };

export type AcaoComentario = {
  operacao: "publicar";
  id: string;
  uploadId: string;
  texto: string;
  respostaA: string | null;
};

type PendenteReacao = AcaoReacao & { id: string; criadoEm: number };
type PendenteComentario = AcaoComentario & { criadoEm: number };

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

export async function enfileirarReacao(acao: AcaoReacao): Promise<void> {
  const pendente: PendenteReacao = {
    ...acao,
    id: acao.uploadId,
    criadoEm: Date.now(),
  };

  await transacionar<void>(LOJA_REACOES, "readwrite", (store) => {
    store.put(pendente);
  });
}

export async function listarReacoesPendentes(): Promise<PendenteReacao[]> {
  return transacionar<PendenteReacao[]>(LOJA_REACOES, "readonly", (store, devolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const lista = ((req.result as PendenteReacao[]) ?? []).sort((a, b) => a.criadoEm - b.criadoEm);
      devolve(lista);
    };
  });
}

export async function removerReacaoPendente(id: string): Promise<void> {
  await transacionar<void>(LOJA_REACOES, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function drenarReacoesPendentes(
  enviar: (acao: AcaoReacao) => Promise<boolean>,
): Promise<void> {
  const pendentes = await listarReacoesPendentes();
  for (const item of pendentes) {
    const sucesso = await enviar(item);
    if (sucesso) await removerReacaoPendente(item.id);
  }
}

export async function enfileirarComentario(acao: AcaoComentario): Promise<void> {
  const pendente: PendenteComentario = { ...acao, criadoEm: Date.now() };
  await transacionar<void>(LOJA_COMENTARIOS, "readwrite", (store) => {
    store.put(pendente);
  });
}

export async function listarComentariosPendentes(): Promise<PendenteComentario[]> {
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

export async function removerComentarioPendente(id: string): Promise<void> {
  await transacionar<void>(LOJA_COMENTARIOS, "readwrite", (store) => {
    store.delete(id);
  });
}

export async function drenarComentariosPendentes(
  enviar: (acao: AcaoComentario) => Promise<boolean>,
): Promise<void> {
  const pendentes = await listarComentariosPendentes();
  for (const item of pendentes) {
    const sucesso = await enviar(item);
    if (sucesso) await removerComentarioPendente(item.id);
  }
}

export async function drenarInteracoesPendentes(opcoes: {
  reacao: (acao: AcaoReacao) => Promise<boolean>;
  comentario: (acao: AcaoComentario) => Promise<boolean>;
}): Promise<void> {
  await drenarReacoesPendentes(opcoes.reacao);
  await drenarComentariosPendentes(opcoes.comentario);
}
