import { describe, expect, it } from "vitest";
import { MAX_ATTEMPTS, type QueueItem } from "@albora/core";
import { createFileQueue, memoryStore } from "./queue";
import { reiniciarItemFalho, reiniciarTodosFalhos } from "./queue-retry";

function item(id: string, tentativas: number): QueueItem {
  return {
    id,
    eventoId: "e",
    corpo: { tipo: "arquivo", caminho: `/tmp/${id}.jpg`, bytes: 1 },
    mime: "image/jpeg",
    criadoEm: 1,
    tentativas,
  };
}

describe("reiniciarItemFalho", () => {
  it("zera tentativas de item falho", async () => {
    const queue = createFileQueue(memoryStore(), "/q");
    await queue.enqueue(item("a", MAX_ATTEMPTS));
    expect(await reiniciarItemFalho(queue, "a")).toBe(true);
    const rows = await queue.list();
    expect(rows[0]?.tentativas).toBe(0);
  });

  it("ignora item ainda retentável", async () => {
    const queue = createFileQueue(memoryStore(), "/q");
    await queue.enqueue(item("a", 1));
    expect(await reiniciarItemFalho(queue, "a")).toBe(false);
  });
});

describe("reiniciarTodosFalhos", () => {
  it("reinicia só os que esgotaram", async () => {
    const queue = createFileQueue(memoryStore(), "/q");
    await queue.enqueue(item("ok", 1));
    await queue.enqueue(item("bad", MAX_ATTEMPTS));
    expect(await reiniciarTodosFalhos(queue)).toBe(1);
    const rows = await queue.list();
    expect(rows.find((r) => r.id === "bad")?.tentativas).toBe(0);
    expect(rows.find((r) => r.id === "ok")?.tentativas).toBe(1);
  });
});
