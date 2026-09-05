import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { resolveActorMock, listRetentionJobsMock, redirectMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listRetentionJobsMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listRetentionJobs: listRetentionJobsMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import RetentionPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function montarJob(overrides: {
  id?: string;
  eventId?: string;
  kind?: "plus_48h" | "d330_drive" | "d358_warn" | "d365_delete";
  status?: "pending" | "running" | "done" | "skipped" | "failed";
  dueAt?: Date;
  attempts?: number;
  lastError?: string | null;
} = {}) {
  return {
    id: overrides.id ?? "job-1",
    eventId: overrides.eventId ?? "event-1",
    kind: overrides.kind ?? "plus_48h",
    status: overrides.status ?? "pending",
    dueAt: overrides.dueAt ?? new Date(Date.now() + 24 * 3600 * 1000),
    attempts: overrides.attempts ?? 0,
    lastError: overrides.lastError === undefined ? null : overrides.lastError,
  };
}

async function pagina(jobs: ReturnType<typeof montarJob>[]) {
  resolveActorMock.mockResolvedValueOnce(actor());
  listRetentionJobsMock.mockResolvedValueOnce({ rows: jobs, nextCursor: null });

  const element = await RetentionPage();
  return renderToStaticMarkup(element);
}

describe("RetentionPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("job falhado renderiza em --critico e é clicável para o evento", async () => {
    const serializado = await pagina([
      montarJob({ id: "job-falho", eventId: "event-falho", status: "failed", lastError: "export_missing" }),
    ]);

    expect(serializado).toContain("text-critico");
    expect(serializado).toContain('href="/console/events/event-falho"');
  });

  it("fila vazia mostra estado vazio honesto (nenhum job pendente), não erro", async () => {
    const serializado = await pagina([]);

    expect(serializado.toLowerCase()).toContain("nenhum job pendente");
    expect(serializado.toLowerCase()).not.toContain("erro ao carregar");
    expect(serializado.toLowerCase()).not.toMatch(/\bexception\b/);
  });

  it("nenhum botão de reprocessar — mutação chega na Onda C", async () => {
    const serializado = await pagina([
      montarJob({ status: "failed", lastError: "export_missing" }),
      montarJob({ status: "pending" }),
      montarJob({ status: "done" }),
    ]);

    expect(serializado).not.toMatch(/<form\b/);
    expect(serializado).not.toMatch(/\binput\b/);

    const controles = [...serializado.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1] ?? "");
    for (const termo of ["reprocessar", "retry", "tentar novamente", "reenviar"]) {
      for (const controle of controles) {
        expect(controle.toLowerCase()).not.toContain(termo);
      }
    }
  });

  it("vencimento no passado com status pendente é atraso e recebe destaque", async () => {
    const serializado = await pagina([
      montarJob({ status: "pending", dueAt: new Date(Date.now() - 3600 * 1000) }),
    ]);

    expect(serializado).toContain("atrasado");
    expect(serializado).toContain("text-critico");
  });

  it("zero PII de convidado — nenhum nome, telefone ou e-mail de convidado na tela", async () => {
    const serializado = await pagina([montarJob({ status: "pending" })]);

    expect(serializado).not.toMatch(/@/);
  });

  it("sem ator resolvido, redireciona para /console/login sem chamar listRetentionJobs", async () => {
    resolveActorMock.mockResolvedValueOnce(null);

    await expect(RetentionPage()).rejects.toThrow("redirect");
    expect(listRetentionJobsMock).not.toHaveBeenCalled();
  });
});
