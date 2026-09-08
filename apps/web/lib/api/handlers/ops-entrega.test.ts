import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListarEventosComEntregaDevida = vi.fn();
vi.mock("@albora/db", () => ({
  listarEventosComEntregaDevida: mockListarEventosComEntregaDevida,
}));

const mockRunDeliveryForEvent = vi.fn();
vi.mock("@albora/application", () => ({
  runDeliveryForEvent: mockRunDeliveryForEvent,
}));

vi.mock("@/lib/db", () => ({
  getAggregatorPool: vi.fn(() => ({})),
  getPool: vi.fn(() => ({})),
}));

vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: "segredo-de-teste" }),
}));

const mockSendHostEmail = vi.fn();
vi.mock("@/lib/email", () => ({ sendHostEmail: mockSendHostEmail }));

const { postOpsEntrega } = await import("./ops-entrega");

function req(): Request {
  return new Request("http://localhost/api/ops/entrega", {
    method: "POST",
    headers: { authorization: "Bearer segredo-de-teste" },
  });
}

describe("POST /api/ops/entrega", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "segredo-de-teste" };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockListarEventosComEntregaDevida.mockResolvedValue([]);
  });

  it("recusa sem Authorization quando CRON_SECRET está definido, sem tocar a listagem nem o runner", async () => {
    const res = await postOpsEntrega(
      new Request("http://localhost/api/ops/entrega", { method: "POST" }),
    );

    expect(res.status).toBe(401);
    expect(mockListarEventosComEntregaDevida).not.toHaveBeenCalled();
    expect(mockRunDeliveryForEvent).not.toHaveBeenCalled();
  });

  it("sem eventos devidos, devolve zeros e não chama runDeliveryForEvent", async () => {
    const res = await postOpsEntrega(req());
    const body = await res.json();

    expect(body).toEqual({ eventos: 0, enviados: 0, pendentes: 0 });
    expect(mockRunDeliveryForEvent).not.toHaveBeenCalled();
  });

  it("itera os eventos devidos e soma enviados/pendentes de cada um", async () => {
    mockListarEventosComEntregaDevida.mockResolvedValue(["evento-a", "evento-b"]);
    mockRunDeliveryForEvent
      .mockResolvedValueOnce({ enviados: 2, pendentes: 1 })
      .mockResolvedValueOnce({ enviados: 3, pendentes: 0 });

    const res = await postOpsEntrega(req());
    const body = await res.json();

    expect(mockRunDeliveryForEvent).toHaveBeenCalledTimes(2);
    expect(mockRunDeliveryForEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ segredo: "segredo-de-teste", sendEmail: mockSendHostEmail }),
      "evento-a",
    );
    expect(body).toEqual({ eventos: 2, enviados: 5, pendentes: 1 });
  });

  it("um evento que lança não aborta o sweep dos outros", async () => {
    mockListarEventosComEntregaDevida.mockResolvedValue(["evento-com-erro", "evento-ok"]);
    mockRunDeliveryForEvent
      .mockRejectedValueOnce(new Error("resend fora do ar"))
      .mockResolvedValueOnce({ enviados: 1, pendentes: 0 });

    const res = await postOpsEntrega(req());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRunDeliveryForEvent).toHaveBeenCalledTimes(2);
    expect(body).toEqual({ eventos: 2, enviados: 1, pendentes: 0 });
  });

  it("erro inesperado na listagem devolve 500 sem vazar detalhe interno", async () => {
    mockListarEventosComEntregaDevida.mockRejectedValue(new Error("banco caiu"));

    const res = await postOpsEntrega(req());
    expect(res.status).toBe(500);
  });
});
