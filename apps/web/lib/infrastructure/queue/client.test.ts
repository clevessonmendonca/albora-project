import "fake-indexeddb/auto";
import type { QueueItem } from "@albora/core";
import { shouldGiveUp, retryWaitSeconds, MAX_ATTEMPTS } from "@albora/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  webQueue,
  clearQueue,
  queueSummary,
  QueueUnavailableError,
  QueueQuotaExceededError,
} from "./client";

/** `fake-indexeddb` — implementação real da spec em memória, não mock escrito à mão; a fila decide se a foto sobrevive ao sinal cair. */

const item = (id: string, criadoEm: number, bytes = 800_000): QueueItem => ({
  id,
  eventoId: "11111111-1111-1111-1111-111111111111",
  corpo: { tipo: "arquivo", caminho: `/tmp/${id}`, bytes },
  mime: "image/jpeg",
  criadoEm,
  tentativas: 0,
});

beforeEach(clearQueue);

describe("enfileirar, listar, remover", () => {
  it("guarda e devolve o item inteiro", async () => {
    await webQueue.enqueue(item("a", 1000));
    const [guardado] = await webQueue.list();

    expect(guardado?.id).toBe("a");
    expect(guardado?.corpo).toEqual({ tipo: "arquivo", caminho: "/tmp/a", bytes: 800_000 });
  });

  it("a foto mais antiga sobe primeiro", async () => {
    await webQueue.enqueue(item("c", 3000));
    await webQueue.enqueue(item("a", 1000));
    await webQueue.enqueue(item("b", 2000));

    // Sem ordem, o convidado que tira dez fotos vê a primeira ficar para trás.
    expect((await webQueue.list()).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("remover tira só o item pedido", async () => {
    await webQueue.enqueue(item("a", 1000));
    await webQueue.enqueue(item("b", 2000));
    await webQueue.remove("a");

    expect((await webQueue.list()).map((i) => i.id)).toEqual(["b"]);
  });

  it("remover id inexistente não estoura", async () => {
    await expect(webQueue.remove("nao-existe")).resolves.toBeUndefined();
  });

  it("recusa item sem id e sem eventoId", async () => {
    await expect(webQueue.enqueue({ ...item("", 1) })).rejects.toThrow(/id/);
    await expect(webQueue.enqueue({ ...item("x", 1), eventoId: "" })).rejects.toThrow(/eventoId/);
  });
});

describe("reenfileirar é o caminho normal", () => {
  it("o mesmo id sobrescreve em vez de estourar", async () => {
    await webQueue.enqueue(item("a", 1000));
    // `add` daria ConstraintError aqui; o convidado perderia a foto por causa
    // de um retry.
    await webQueue.enqueue({ ...item("a", 1000), tentativas: 2 });

    const itens = await webQueue.list();
    expect(itens).toHaveLength(1);
    expect(itens[0]?.tentativas).toBe(2);
  });
});

describe("contagem de tentativas", () => {
  it("incrementa e persiste", async () => {
    await webQueue.enqueue(item("a", 1000));
    await webQueue.markAttempt("a");
    await webQueue.markAttempt("a");

    expect((await webQueue.list())[0]?.tentativas).toBe(2);
  });

  it("marcar item inexistente não cria linha", async () => {
    await webQueue.markAttempt("fantasma");

    expect(await webQueue.list()).toHaveLength(0);
  });

  it("alcança o teto e o item vira falha visível", async () => {
    await webQueue.enqueue(item("a", 1000));
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) await webQueue.markAttempt("a");

    const [guardado] = await webQueue.list();
    expect(shouldGiveUp(guardado!)).toBe(true);
  });

  it("o backoff cresce e tem teto", async () => {
    // Sem teto, a sexta tentativa esperaria mais que a festa inteira dura.
    expect(retryWaitSeconds(0)).toBe(1);
    expect(retryWaitSeconds(3)).toBe(8);
    expect(retryWaitSeconds(10)).toBe(60);
  });
});

describe("anotar enquanto a foto ainda está na fila", () => {
  it("guarda legenda, lugar e missão sem tocar no resto do item", async () => {
    await webQueue.enqueue(item("a", 1000));

    const anotado = await webQueue.annotate("a", {
      legenda: "a pista cheia",
      lugar: "pista",
      desafioId: "22222222-2222-2222-2222-222222222222",
    });
    const [guardado] = await webQueue.list();

    expect(anotado).toBe(true);
    expect(guardado?.legenda).toBe("a pista cheia");
    expect(guardado?.lugar).toBe("pista");
    expect(guardado?.corpo).toEqual({ tipo: "arquivo", caminho: "/tmp/a", bytes: 800_000 });
  });

  it("devolve false quando o item já saiu da fila", async () => {
    // É o sinal de "a anotação é do banco, não da fila". Sem ele, a legenda de
    // uma foto que subiu rápido sumiria em silêncio.
    expect(await webQueue.annotate("nunca-existiu", { legenda: "oi" })).toBe(false);
  });

  it("não ressuscita item removido", async () => {
    await webQueue.enqueue(item("a", 1000));
    await webQueue.remove("a");
    await webQueue.annotate("a", { legenda: "tarde demais" });

    expect(await webQueue.list()).toHaveLength(0);
  });
});

describe("resumo para a tela", () => {
  it("conta itens e bytes pendentes", async () => {
    await webQueue.enqueue(item("a", 1000, 800_000));
    await webQueue.enqueue(item("b", 2000, 200_000));

    // É o que responde "as suas oito estão aqui" — sem isso o convidado para
    // de mandar por dúvida, não por desinteresse.
    expect(await queueSummary()).toEqual({ itens: 2, bytes: 1_000_000 });
  });

  it("fila vazia é zero, não erro", async () => {
    expect(await queueSummary()).toEqual({ itens: 0, bytes: 0 });
  });
});

describe("dimensões viajam com o item", () => {
  it("guarda largura e altura do vídeo para o confirm", async () => {
    await webQueue.enqueue({ ...item("v", 1000), mime: "video/mp4", largura: 1920, altura: 1080 });
    const [guardado] = await webQueue.list();

    expect(guardado?.largura).toBe(1920);
    expect(guardado?.altura).toBe(1080);
  });
});

/**
 * `IndexedDB` é a fronteira do navegador, não o módulo sob teste: as fitas
 * abaixo trocam `globalThis.indexedDB` por um motor de mentira para forçar os
 * três jeitos de o Safari/Firefox de verdade recusar a fila (open() lança,
 * onerror, onblocked) e os dois jeitos de uma transação abortar (cota
 * esgotada vs. erro genérico) — `fake-indexeddb` (spec real) não reproduz
 * esses caminhos de erro de forma determinística.
 */
describe("indisponibilidade do motor — o sinal caiu e a fila não pode fingir que não", () => {
  const motorReal = globalThis.indexedDB;

  afterEach(() => {
    globalThis.indexedDB = motorReal;
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dublê da fronteira do navegador (IndexedDB), não do módulo sob teste; tipar `IDBRequest`/`IDBTransaction` de verdade aqui só embrulha cada handler num `this` que a spec real nunca checa.
  function fakeRequest(): any {
    return {};
  }

  it("open() lançando síncrono vira QueueUnavailableError", async () => {
    globalThis.indexedDB = {
      open() {
        throw new Error("IndexedDB desligado neste modo de navegação");
      },
    } as unknown as IDBFactory;

    await expect(webQueue.enqueue(item("a", 1))).rejects.toBeInstanceOf(QueueUnavailableError);
  });

  it("onerror do open() vira QueueUnavailableError", async () => {
    globalThis.indexedDB = {
      open() {
        const req = fakeRequest();
        queueMicrotask(() => {
          req.error = new Error("disco corrompido");
          req.onerror?.(new Event("error"));
        });
        return req;
      },
    } as unknown as IDBFactory;

    await expect(webQueue.enqueue(item("a", 1))).rejects.toBeInstanceOf(QueueUnavailableError);
  });

  it("onblocked (outra aba com a versão antiga aberta) vira QueueUnavailableError", async () => {
    globalThis.indexedDB = {
      open() {
        const req = fakeRequest();
        queueMicrotask(() => req.onblocked?.(new Event("blocked")));
        return req;
      },
    } as unknown as IDBFactory;

    await expect(webQueue.enqueue(item("a", 1))).rejects.toMatchObject({
      causa: expect.stringMatching(/outra aba/),
    });
  });

  /** Fábrica de um `indexedDB` de mentira cujo `open()` sempre sucede num banco cuja `transaction()` aborta com o motivo dado. */
  function motorComTransacaoAbortando(motivo: unknown): IDBFactory {
    const storeFalso = {
      put: () => undefined,
      delete: () => undefined,
      get: () => fakeRequest(),
      index: () => ({ getAll: () => fakeRequest() }),
    };
    const dbFalso = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        const tx = fakeRequest();
        tx.objectStore = () => storeFalso;
        queueMicrotask(() => {
          tx.error = motivo;
          tx.onabort?.(new Event("abort"));
        });
        return tx;
      },
      close: () => undefined,
    };

    return {
      open() {
        const req = fakeRequest();
        queueMicrotask(() => {
          req.result = dbFalso;
          req.onsuccess?.(new Event("success"));
        });
        return req;
      },
    } as unknown as IDBFactory;
  }

  it("transação abortada por cota vira QueueQuotaExceededError, mesmo sem o `name` chegar exato", async () => {
    globalThis.indexedDB = motorComTransacaoAbortando({ name: "QuotaExceededError" });

    await expect(webQueue.enqueue(item("a", 1))).rejects.toBeInstanceOf(QueueQuotaExceededError);
  });

  it("transação abortada por outro motivo propaga o erro original, não vira cota esgotada", async () => {
    const motivo = new Error("motivo desconhecido do navegador");
    globalThis.indexedDB = motorComTransacaoAbortando(motivo);

    await expect(webQueue.enqueue(item("a", 1))).rejects.toBe(motivo);
  });

  it("erro direto na transação (onerror) rejeita com o erro original", async () => {
    const storeFalso = {
      put: () => undefined,
      delete: () => undefined,
      get: () => fakeRequest(),
      index: () => ({ getAll: () => fakeRequest() }),
    };
    const motivo = new Error("transação corrompida");
    globalThis.indexedDB = {
      open() {
        const req = fakeRequest();
        queueMicrotask(() => {
          req.result = {
            transaction: () => {
              const tx = fakeRequest();
              tx.objectStore = () => storeFalso;
              queueMicrotask(() => {
                tx.error = motivo;
                tx.onerror?.(new Event("error"));
              });
              return tx;
            },
            close: () => undefined,
          };
          req.onsuccess?.(new Event("success"));
        });
        return req;
      },
    } as unknown as IDBFactory;

    await expect(webQueue.enqueue(item("a", 1))).rejects.toBe(motivo);
  });
});

