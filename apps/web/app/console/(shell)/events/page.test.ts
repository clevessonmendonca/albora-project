import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { resolveActorMock, listEventsMock, redirectMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listEventsMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listEvents: listEventsMock }));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import EventsPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function montarEvento(overrides: {
  id?: string;
  title?: string | null;
  accountId?: string;
  hostMaskedEmail?: string;
  vendorId?: string | null;
  vendorName?: string | null;
  startsAt?: Date;
  expectedGuests?: number;
  totalFotos?: number;
  h1?: number | null;
  status?: "draft" | "active" | "ended";
} = {}) {
  return {
    id: overrides.id ?? "evento-1",
    title: overrides.title ?? "Festa de Ana e João",
    accountId: overrides.accountId ?? "conta-1",
    hostMaskedEmail: overrides.hostMaskedEmail ?? "an••••@exemplo.test",
    vendorId: overrides.vendorId ?? null,
    vendorName: overrides.vendorName ?? null,
    startsAt: overrides.startsAt ?? new Date("2026-06-01T20:00:00Z"),
    expectedGuests: overrides.expectedGuests ?? 150,
    totalFotos: overrides.totalFotos ?? 42,
    h1: overrides.h1 === undefined ? 0.55 : overrides.h1,
    status: overrides.status ?? ("active" as const),
  };
}

async function paginaComEventos(searchParams: Record<string, string>, eventos: ReturnType<typeof montarEvento>[]) {
  resolveActorMock.mockResolvedValueOnce(actor());
  listEventsMock.mockResolvedValueOnce({ rows: eventos, nextCursor: null });

  const element = await EventsPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(element);
}

describe("EventsPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("sem ator resolvido, redireciona para /console/login sem chamar listEvents", async () => {
    resolveActorMock.mockResolvedValueOnce(null);

    await expect(EventsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(listEventsMock).not.toHaveBeenCalled();
  });

  it("H1 aparece formatado como porcentagem", async () => {
    const serializado = await paginaComEventos({}, [montarEvento({ h1: 0.55 })]);
    expect(serializado).toContain("55%");
  });

  it("H1 null renderiza '—', nunca '0%'", async () => {
    const serializado = await paginaComEventos({}, [montarEvento({ h1: null })]);
    expect(serializado).toContain("—");
    expect(serializado).not.toContain("0%");
  });

  it("coluna H1 é ordenável (aria-sort presente no cabeçalho, não em coluna qualquer)", async () => {
    const serializado = await paginaComEventos({}, [montarEvento()]);
    const blocoH1 = serializado.split("<th").find((b) => b.includes(">H1<"));
    expect(blocoH1).toBeDefined();
    expect(blocoH1).toContain('aria-sort="none"');
  });

  it("contagem exibida reflete o conjunto filtrado (2 linhas), não um total maior não passado ao componente", async () => {
    const serializado = await paginaComEventos({}, [
      montarEvento({ id: "evento-1" }),
      montarEvento({ id: "evento-2" }),
    ]);
    expect(serializado).toContain("2 eventos");
    expect(serializado).not.toContain("3 eventos");
  });

  it("nenhuma coluna expõe nome ou contato de convidado", async () => {
    const serializado = await paginaComEventos({}, [montarEvento()]);
    expect(serializado).not.toContain("convidado-");
    expect(serializado).not.toMatch(/[a-z0-9._-]+@exemplo\.test/i);
    expect(serializado).toContain("an••••@exemplo.test");
  });

  it("fornecedor ausente aparece como '—', evento direto", async () => {
    const serializado = await paginaComEventos({}, [montarEvento({ vendorName: null })]);
    expect(serializado).toContain("—");
  });
});
