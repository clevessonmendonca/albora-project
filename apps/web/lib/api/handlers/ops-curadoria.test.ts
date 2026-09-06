import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListEventsNeedingCurationEnqueue = vi.fn();
const mockEnqueueCuration = vi.fn();
const mockListEventsWithPendingCuration = vi.fn();
const mockReclaimStaleCurationJob = vi.fn();
const mockReclaimFailedCurationJob = vi.fn();
const mockClaimCurationJobs = vi.fn();
const mockListUploadsAwaitingCurationScore = vi.fn();
const mockCompleteCurationJob = vi.fn();
const mockFailCurationJob = vi.fn();
const mockCuratePendingForEventNow = vi.fn();

vi.mock("@albora/db", () => ({
  listEventsNeedingCurationEnqueue: mockListEventsNeedingCurationEnqueue,
  enqueueCuration: mockEnqueueCuration,
  listEventsWithPendingCuration: mockListEventsWithPendingCuration,
  reclaimStaleCurationJob: mockReclaimStaleCurationJob,
  reclaimFailedCurationJob: mockReclaimFailedCurationJob,
  claimCurationJobs: mockClaimCurationJobs,
  listUploadsAwaitingCurationScore: mockListUploadsAwaitingCurationScore,
  completeCurationJob: mockCompleteCurationJob,
  failCurationJob: mockFailCurationJob,
  // withEvent aqui só encaminha — a RLS/SET LOCAL de verdade é coberta pelos
  // testes de `packages/db/src/curation.test.ts` contra banco real.
  withEvent: (_pool: unknown, _eventId: string, executar: (c: unknown) => unknown) => executar({}),
}));

vi.mock("@/lib/db", () => ({
  getPool: vi.fn(() => ({})),
  getAggregatorPool: vi.fn(() => ({})),
}));

vi.mock("@/lib/domain/media/curate", () => ({
  curatePendingForEventNow: mockCuratePendingForEventNow,
}));

const { postOpsCuradoria } = await import("./ops-curadoria");

function req(): Request {
  return new Request("http://localhost/api/ops/curadoria", {
    method: "POST",
    headers: { authorization: "Bearer segredo-de-teste" },
  });
}

describe("POST /api/ops/curadoria", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, CRON_SECRET: "segredo-de-teste" };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    mockListEventsNeedingCurationEnqueue.mockResolvedValue([]);
    mockEnqueueCuration.mockResolvedValue(undefined);
    mockListEventsWithPendingCuration.mockResolvedValue([]);
    mockReclaimStaleCurationJob.mockResolvedValue(0);
    mockReclaimFailedCurationJob.mockResolvedValue(0);
    mockClaimCurationJobs.mockResolvedValue([]);
    mockListUploadsAwaitingCurationScore.mockResolvedValue([]);
    mockCompleteCurationJob.mockResolvedValue(undefined);
    mockFailCurationJob.mockResolvedValue("retry");
    mockCuratePendingForEventNow.mockResolvedValue(0);
  });

  it("enfileira evento encerrado antes de listar pendentes, e não interrompe o sweep se o enfileiramento falhar", async () => {
    mockListEventsNeedingCurationEnqueue.mockResolvedValue(["evento-recem-encerrado"]);

    const res = await postOpsCuradoria(req());

    expect(mockEnqueueCuration).toHaveBeenCalledWith(expect.anything(), "evento-recem-encerrado");
    expect(res.status).toBe(200);
  });

  it("erro ao enfileirar um evento não derruba o sweep", async () => {
    mockListEventsNeedingCurationEnqueue.mockResolvedValue(["evento-com-erro-no-enqueue"]);
    mockEnqueueCuration.mockRejectedValue(new Error("banco caiu"));

    const res = await postOpsCuradoria(req());

    expect(res.status).toBe(200);
    expect(mockListEventsWithPendingCuration).toHaveBeenCalled();
  });

  it("recusa sem Authorization quando CRON_SECRET está definido", async () => {
    const res = await postOpsCuradoria(
      new Request("http://localhost/api/ops/curadoria", { method: "POST" }),
    );
    expect(res.status).toBe(401);
    expect(mockListEventsWithPendingCuration).not.toHaveBeenCalled();
  });

  it("sem eventos pendentes, devolve zeros e não bate em claim nem em curatePendingForEventNow", async () => {
    const res = await postOpsCuradoria(req());
    const body = await res.json();

    expect(body).toEqual({ eventos: 0, processados: 0, semJob: 0, falhas: 0 });
    expect(mockClaimCurationJobs).not.toHaveBeenCalled();
    expect(mockCuratePendingForEventNow).not.toHaveBeenCalled();
  });

  it("evento sem job para reivindicar (outro worker já pegou, ou nada pendente) não processa nada", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-a"]);
    mockClaimCurationJobs.mockResolvedValue([]);

    const res = await postOpsCuradoria(req());
    const body = await res.json();

    expect(mockCuratePendingForEventNow).not.toHaveBeenCalled();
    expect(body).toEqual({ eventos: 1, processados: 0, semJob: 1, falhas: 0 });
  });

  it("reivindica o job, drena a fila de mídia rodada a rodada e completa quando não sobra nada", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-a"]);
    mockClaimCurationJobs.mockResolvedValue([{ id: "job-1", eventId: "evento-a", attempts: 1 }]);
    mockCuratePendingForEventNow.mockResolvedValueOnce(3).mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    mockListUploadsAwaitingCurationScore.mockResolvedValue([]);

    const res = await postOpsCuradoria(req());
    const body = await res.json();

    expect(mockCuratePendingForEventNow).toHaveBeenCalledTimes(3);
    expect(mockCompleteCurationJob).toHaveBeenCalledWith(expect.anything(), "job-1");
    expect(mockFailCurationJob).not.toHaveBeenCalled();
    expect(body).toEqual({ eventos: 1, processados: 1, semJob: 0, falhas: 0 });
  });

  it("teto de rodadas por evento não trava num backlog gigante, e o job NÃO é completado (fica processing para a próxima varredura)", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-a"]);
    mockClaimCurationJobs.mockResolvedValue([{ id: "job-1", eventId: "evento-a", attempts: 1 }]);
    mockCuratePendingForEventNow.mockResolvedValue(1); // nunca chega a 0
    mockListUploadsAwaitingCurationScore.mockResolvedValue([{ uploadId: "resta-1", chaveFull: "x" }]);

    await postOpsCuradoria(req());

    // RODADAS_MAX_POR_EVENTO = 5 — não fica em loop infinito.
    expect(mockCuratePendingForEventNow).toHaveBeenCalledTimes(5);
    expect(mockCompleteCurationJob).not.toHaveBeenCalled();
  });

  it("reclama claim órfão antes de reivindicar — job preso em processing de processo morto volta a ser visível", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-a"]);
    mockClaimCurationJobs.mockResolvedValue([{ id: "job-1", eventId: "evento-a", attempts: 2 }]);

    await postOpsCuradoria(req());

    expect(mockReclaimStaleCurationJob).toHaveBeenCalledWith(expect.anything(), "evento-a", 600);
  });

  it("reclama failed além da janela de recuperação antes do reclaim de processing (achado 7)", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-a"]);
    mockClaimCurationJobs.mockResolvedValue([{ id: "job-1", eventId: "evento-a", attempts: 0 }]);

    await postOpsCuradoria(req());

    expect(mockReclaimFailedCurationJob).toHaveBeenCalledWith(expect.anything(), "evento-a", 86_400);
    expect(mockListEventsWithPendingCuration).toHaveBeenCalledWith(expect.anything(), 100, 600, 86_400);
  });

  it("erro sistêmico ao processar o evento marca o job failed e não interrompe os demais eventos", async () => {
    mockListEventsWithPendingCuration.mockResolvedValue(["evento-com-erro", "evento-ok"]);
    mockClaimCurationJobs
      .mockResolvedValueOnce([{ id: "job-erro", eventId: "evento-com-erro", attempts: 1 }])
      .mockResolvedValueOnce([{ id: "job-ok", eventId: "evento-ok", attempts: 1 }]);
    mockCuratePendingForEventNow
      .mockRejectedValueOnce(new Error("banco caiu"))
      .mockResolvedValueOnce(0);
    mockListUploadsAwaitingCurationScore.mockResolvedValue([]);

    const res = await postOpsCuradoria(req());
    const body = await res.json();

    expect(mockFailCurationJob).toHaveBeenCalledWith(expect.anything(), "job-erro", 3, expect.any(String));
    expect(mockCompleteCurationJob).toHaveBeenCalledWith(expect.anything(), "job-ok");
    expect(body).toEqual({ eventos: 2, processados: 1, semJob: 0, falhas: 1 });
  });

  it("erro inesperado na listagem devolve 500 sem vazar detalhe interno", async () => {
    mockListEventsWithPendingCuration.mockRejectedValue(new Error("banco caiu"));

    const res = await postOpsCuradoria(req());
    expect(res.status).toBe(500);
  });
});
