import { describe, expect, it } from "vitest";
import { createFileQueue, memoryStore } from "./queue";
import type { QueueItem } from "@albora/core";

function item(over: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "a1",
    eventoId: "ev-1",
    corpo: { tipo: "arquivo", caminho: "/tmp/a.jpg", bytes: 12 },
    mime: "image/jpeg",
    criadoEm: 1,
    tentativas: 0,
    ...over,
  };
}

describe("fila em arquivo — o contrato do core, o disco no lugar do IndexedDB", () => {
  it("enfileira, lista e remove sem perder o id", async () => {
    const q = createFileQueue(memoryStore(), "fila");
    await q.enqueue(item());
    expect((await q.list())[0]?.id).toBe("a1");
    await q.remove("a1");
    expect(await q.list()).toEqual([]);
  });

  it("anotar item que já saiu devolve false — a anotação passa a ser do banco", async () => {
    const q = createFileQueue(memoryStore(), "fila");
    expect(await q.annotate("sumiu", { legenda: "oi" })).toBe(false);
    await q.enqueue(item());
    expect(await q.annotate("a1", { legenda: "mesa 4" })).toBe(true);
    expect((await q.list())[0]?.legenda).toBe("mesa 4");
  });

  it("corpo é referência de arquivo, não blob", async () => {
    const q = createFileQueue(memoryStore(), "fila");
    await q.enqueue(item());
    const corpo = (await q.list())[0]?.corpo;
    expect(corpo?.tipo).toBe("arquivo");
  });
});
