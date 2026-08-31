import "fake-indexeddb/auto";
import type { QueueItem } from "@albora/core";
import { MAX_ATTEMPTS } from "@albora/core";
import { beforeEach, describe, expect, it } from "vitest";
import { clearQueue, webQueue } from "./queue";
import { reiniciarItemFalho, reiniciarTodosFalhos } from "./queue-retry";

const item = (id: string, tentativas = 0): QueueItem => ({
  id,
  eventoId: "evt",
  corpo: { tipo: "blob", blob: new Blob(["x"]) },
  mime: "image/jpeg",
  criadoEm: 1,
  tentativas,
});

describe("queue-retry", () => {
  beforeEach(async () => {
    await clearQueue();
  });

  it("reinicia um item falho", async () => {
    await webQueue.enqueue(item("a", MAX_ATTEMPTS));
    expect(await reiniciarItemFalho(webQueue, "a")).toBe(true);
    expect((await webQueue.list())[0]?.tentativas).toBe(0);
  });

  it("reinicia todos os falhos", async () => {
    await webQueue.enqueue(item("a", MAX_ATTEMPTS));
    await webQueue.enqueue(item("b", MAX_ATTEMPTS));
    await webQueue.enqueue(item("c", 1));
    expect(await reiniciarTodosFalhos(webQueue)).toBe(2);
    const rows = await webQueue.list();
    expect(rows.find((r) => r.id === "a")?.tentativas).toBe(0);
    expect(rows.find((r) => r.id === "b")?.tentativas).toBe(0);
    expect(rows.find((r) => r.id === "c")?.tentativas).toBe(1);
  });
});
