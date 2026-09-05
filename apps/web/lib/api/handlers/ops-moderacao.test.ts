import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListEventsWithPendingModeration = vi.fn();
const mockListEventsWithOrphanedUploads = vi.fn();
const mockClassifyPendingForEventNow = vi.fn();
const mockEnqueueOrphanedUploadsForEventNow = vi.fn();

vi.mock("@albora/db", () => ({
  listEventsWithPendingModeration: mockListEventsWithPendingModeration,
  listEventsWithOrphanedUploads: mockListEventsWithOrphanedUploads,
}));

vi.mock("@/lib/db", () => ({
  getAggregatorPool: vi.fn(() => ({})),
}));

vi.mock("@/lib/classify-media", () => ({
  classifyPendingForEventNow: mockClassifyPendingForEventNow,
  enqueueOrphanedUploadsForEventNow: mockEnqueueOrphanedUploadsForEventNow,
}));

const { postOpsModeracao } = await import("./ops-moderacao");

function req(): Request {
  return new Request("http://localhost/api/ops/moderacao", {
    method: "POST",
    headers: { authorization: "Bearer segredo-de-teste" },
  });
}

describe("POST /api/ops/moderacao", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "segredo-de-teste" };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockListEventsWithPendingModeration.mockResolvedValue([]);
    mockListEventsWithOrphanedUploads.mockResolvedValue([]);
    mockClassifyPendingForEventNow.mockResolvedValue(0);
    mockEnqueueOrphanedUploadsForEventNow.mockResolvedValue(0);
  });

  it("recusa sem Authorization quando CRON_SECRET está definido", async () => {
    const res = await postOpsModeracao(
      new Request("http://localhost/api/ops/moderacao", { method: "POST" }),
    );
    expect(res.status).toBe(401);
    expect(mockListEventsWithPendingModeration).not.toHaveBeenCalled();
  });

  it("sem eventos pendentes nem órfãos, devolve zeros e não bate em classify nem enqueue", async () => {
    const res = await postOpsModeracao(req());
    const body = await res.json();

    expect(body).toEqual({ eventos: 0, enfileirados: 0, processados: 0 });
    expect(mockEnqueueOrphanedUploadsForEventNow).not.toHaveBeenCalled();
    expect(mockClassifyPendingForEventNow).not.toHaveBeenCalled();
  });

  it("drena a fila normal rodada a rodada até o claim não trazer mais nada", async () => {
    mockListEventsWithPendingModeration.mockResolvedValue(["evento-a"]);
    mockClassifyPendingForEventNow
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const res = await postOpsModeracao(req());
    const body = await res.json();

    expect(mockClassifyPendingForEventNow).toHaveBeenCalledTimes(3);
    expect(body).toEqual({ eventos: 1, enfileirados: 0, processados: 5 });
  });

  it("teto de rodadas por evento não trava num backlog gigante", async () => {
    mockListEventsWithPendingModeration.mockResolvedValue(["evento-a"]);
    mockClassifyPendingForEventNow.mockResolvedValue(1); // nunca chega a 0

    await postOpsModeracao(req());

    // RODADAS_MAX_POR_EVENTO = 5 — não fica em loop infinito.
    expect(mockClassifyPendingForEventNow).toHaveBeenCalledTimes(5);
  });

  it("evento com upload órfão (fora da fila) é enfileirado antes de classificar — a lacuna que o comentário antigo dizia estar coberta e não estava", async () => {
    // `listEventsWithPendingModeration` não vê este evento: photo_moderation
    // não tem nenhuma linha para ele (enqueueModeration falhou por completo
    // sob o SAVEPOINT do confirm). Só `listEventsWithOrphanedUploads`
    // (que olha `uploads` direto) o encontra.
    mockListEventsWithPendingModeration.mockResolvedValue([]);
    mockListEventsWithOrphanedUploads.mockResolvedValue(["evento-orfao"]);
    mockEnqueueOrphanedUploadsForEventNow.mockResolvedValue(2);
    mockClassifyPendingForEventNow.mockResolvedValueOnce(2).mockResolvedValueOnce(0);

    const res = await postOpsModeracao(req());
    const body = await res.json();

    expect(mockEnqueueOrphanedUploadsForEventNow).toHaveBeenCalledWith("evento-orfao");
    // Só depois de enfileirar é que o evento é classificado — sem isso a
    // mídia recém-reenfileirada não seria drenada nesta mesma passada.
    expect(mockClassifyPendingForEventNow).toHaveBeenCalledWith("evento-orfao");
    expect(body).toEqual({ eventos: 1, enfileirados: 2, processados: 2 });
  });

  it("evento presente nas duas listagens (fila E órfãos) não é processado duas vezes", async () => {
    mockListEventsWithPendingModeration.mockResolvedValue(["evento-a"]);
    mockListEventsWithOrphanedUploads.mockResolvedValue(["evento-a"]);
    mockClassifyPendingForEventNow.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await postOpsModeracao(req());

    expect(mockEnqueueOrphanedUploadsForEventNow).toHaveBeenCalledTimes(1);
    expect(mockEnqueueOrphanedUploadsForEventNow).toHaveBeenCalledWith("evento-a");
  });

  it("erro inesperado devolve 500 sem vazar detalhe interno", async () => {
    mockListEventsWithPendingModeration.mockRejectedValue(new Error("banco caiu"));

    const res = await postOpsModeracao(req());
    expect(res.status).toBe(500);
  });
});
