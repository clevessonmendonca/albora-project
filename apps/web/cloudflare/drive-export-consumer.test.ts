import { describe, expect, it, vi } from "vitest";
import { consumirLoteDriveExport, tickDriveExportViaFetch, urlTickDriveExport } from "../cloudflare/drive-export-consumer";

const EVENT = "11111111-1111-4111-8111-111111111111";
const JOB = "22222222-2222-4222-8222-222222222222";
const ACCOUNT = "33333333-3333-4333-8333-333333333333";

function msg(body: unknown, ack = vi.fn(), retry = vi.fn()) {
  return { body, ack, retry };
}

function lote(...messages: ReturnType<typeof msg>[]) {
  return { messages } as unknown as MessageBatch<unknown>;
}

describe("urlTickDriveExport", () => {
  it("usa APP_URL quando definida", () => {
    expect(urlTickDriveExport({ APP_URL: "https://albora.app/" })).toBe(
      "https://albora.app/api/jobs/drive-export",
    );
  });

  it("cai no host interno sem APP_URL", () => {
    expect(urlTickDriveExport({})).toBe("https://internal/api/jobs/drive-export");
  });
});

describe("tickDriveExportViaFetch", () => {
  it("envia bearer e json", async () => {
    const fetchImpl = vi.fn<(req: Request) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    await tickDriveExportViaFetch(
      { eventId: EVENT, jobId: JOB, accountId: ACCOUNT },
      { fetchImpl, url: "https://internal/api/jobs/drive-export", secret: "segredo" },
    );
    expect(fetchImpl).toHaveBeenCalledOnce();
    const req = fetchImpl.mock.calls[0]![0]!;
    expect(req.method).toBe("POST");
    expect(req.headers.get("authorization")).toBe("Bearer segredo");
    expect(await req.json()).toEqual({ eventId: EVENT, jobId: JOB, accountId: ACCOUNT });
  });
});

describe("consumirLoteDriveExport", () => {
  it("retry em lote quando falta segredo", async () => {
    const m = msg({ eventId: EVENT, jobId: JOB, accountId: ACCOUNT });
    await consumirLoteDriveExport(lote(m), {});
    expect(m.retry).toHaveBeenCalled();
    expect(m.ack).not.toHaveBeenCalled();
  });

  it("ack em tick ok via self-reference", async () => {
    const m = msg({ eventId: EVENT, jobId: JOB, accountId: ACCOUNT });
    const fetchImpl = vi.fn<(req: Request) => Promise<Response>>(async () =>
      new Response(JSON.stringify({ fechou: false }), { status: 200 }),
    );
    await consumirLoteDriveExport(lote(m), {
      JOB_RUNNER_SECRET: "segredo",
      WORKER_SELF_REFERENCE: { fetch: fetchImpl } as unknown as Fetcher,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(m.ack).toHaveBeenCalled();
  });

  it("ack e descarta payload inválido", async () => {
    const m = msg({ eventId: "invalido" });
    await consumirLoteDriveExport(lote(m), { JOB_RUNNER_SECRET: "segredo" });
    expect(m.ack).toHaveBeenCalled();
    expect(m.retry).not.toHaveBeenCalled();
  });
});
