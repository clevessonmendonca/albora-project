import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_ATTEMPTS, type Queue, type QueueItem, type SendResult } from "@albora/core";
import { drainAndReport, funnelEventsFromDrain } from "./funnel-from-drain";

const retentar = (id: string, motivo = "put 503"): SendResult => ({
  estado: "retentar",
  id,
  esperaSegundos: 2,
  motivo,
});

describe("funnelEventsFromDrain", () => {
  it("a primeira queda do PUT é upload_fail, sem retry", () => {
    expect(funnelEventsFromDrain([retentar("a")], new Map([["a", 0]]))).toEqual(["upload_fail"]);
  });

  it("tentar de novo depois da falha dispara retry", () => {
    expect(funnelEventsFromDrain([{ estado: "enviado", id: "a" }], new Map([["a", 1]]))).toEqual([
      "retry",
    ]);
  });

  it("retry que cai de novo conta os dois", () => {
    expect(funnelEventsFromDrain([retentar("a")], new Map([["a", 1]]))).toEqual([
      "retry",
      "upload_fail",
    ]);
  });

  it("erro definitivo no PUT também é upload_fail", () => {
    expect(
      funnelEventsFromDrain(
        [{ estado: "desistiu", id: "a", motivo: "put 403" }],
        new Map([["a", 0]]),
      ),
    ).toEqual(["upload_fail"]);
  });

  it("item já esgotado não volta a contar no dreno seguinte", () => {
    expect(
      funnelEventsFromDrain(
        [{ estado: "desistiu", id: "a", motivo: "tentativas esgotadas" }],
        new Map([["a", MAX_ATTEMPTS]]),
      ),
    ).toEqual([]);
  });
});

function memoryQueue(initial: QueueItem[] = []) {
  const items = new Map(initial.map((i) => [i.id, { ...i }]));
  const queue: Queue = {
    async enqueue(i) {
      items.set(i.id, { ...i });
    },
    async list() {
      return [...items.values()];
    },
    async remove(id) {
      items.delete(id);
    },
    async markAttempt(id) {
      const i = items.get(id);
      if (i) i.tentativas += 1;
    },
    async annotate() {
      return false;
    },
  };
  return queue;
}

const item = (tentativas: number): QueueItem => ({
  id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  eventoId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  corpo: { tipo: "blob", blob: new Blob(["x"], { type: "image/jpeg" }) },
  mime: "image/jpeg",
  criadoEm: 1,
  tentativas,
});

describe("drainAndReport", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUT que falha manda upload_fail para /api/funnel", async () => {
    await drainAndReport(memoryQueue([item(0)]), {
      async presign() {
        return {
          uploadId: item(0).id,
          chave: "events/e/full",
          full: "https://storage.test/full",
          thumb: "https://storage.test/thumb",
          expiraEm: Date.now() + 60_000,
        };
      },
      async sendBytes() {
        throw new Error("put 503");
      },
      async confirm() {},
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/funnel",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "upload_fail" }),
      }),
    );
  });

  it("segunda tentativa manda retry antes do resultado", async () => {
    await drainAndReport(memoryQueue([item(1)]), {
      async presign() {
        return {
          uploadId: item(1).id,
          chave: "events/e/full",
          full: "https://storage.test/full",
          thumb: "https://storage.test/thumb",
          expiraEm: Date.now() + 60_000,
        };
      },
      async sendBytes() {},
      async confirm() {},
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/funnel",
      expect.objectContaining({
        body: JSON.stringify({ name: "retry" }),
      }),
    );
  });
});
