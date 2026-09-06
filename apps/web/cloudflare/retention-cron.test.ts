import { describe, expect, it, vi } from "vitest";
import { executarRetencaoAgendada, urlOpsRetencao } from "../cloudflare/retention-cron";

describe("urlOpsRetencao", () => {
  it("usa APP_URL quando definida", () => {
    expect(urlOpsRetencao({ APP_URL: "https://albora.app/" })).toBe(
      "https://albora.app/api/ops/retencao",
    );
  });

  it("cai no host interno sem APP_URL", () => {
    expect(urlOpsRetencao({})).toBe("https://internal/api/ops/retencao");
  });
});

describe("executarRetencaoAgendada", () => {
  it("não chama fetch sem CRON_SECRET", async () => {
    const fetchImpl = vi.fn();
    await executarRetencaoAgendada({
      WORKER_SELF_REFERENCE: { fetch: fetchImpl } as unknown as Fetcher,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("envia bearer via self-reference quando ok", async () => {
    const fetchImpl = vi.fn<(req: Request) => Promise<Response>>(async () =>
      new Response("{}", { status: 200 }),
    );
    await executarRetencaoAgendada({
      CRON_SECRET: "segredo",
      APP_URL: "https://albora.app",
      WORKER_SELF_REFERENCE: { fetch: fetchImpl } as unknown as Fetcher,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const req = fetchImpl.mock.calls[0]![0]!;
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://albora.app/api/ops/retencao");
    expect(req.headers.get("authorization")).toBe("Bearer segredo");
  });

  it("não lança quando o fetch responde erro", async () => {
    const fetchImpl = vi.fn<(req: Request) => Promise<Response>>(async () =>
      new Response("erro", { status: 500 }),
    );
    await expect(
      executarRetencaoAgendada({
        CRON_SECRET: "segredo",
        WORKER_SELF_REFERENCE: { fetch: fetchImpl } as unknown as Fetcher,
      }),
    ).resolves.toBeUndefined();
  });

  it("não lança quando o fetch rejeita", async () => {
    const fetchImpl = vi.fn<(req: Request) => Promise<Response>>(async () => {
      throw new Error("rede fora");
    });
    await expect(
      executarRetencaoAgendada({
        CRON_SECRET: "segredo",
        WORKER_SELF_REFERENCE: { fetch: fetchImpl } as unknown as Fetcher,
      }),
    ).resolves.toBeUndefined();
  });
});
