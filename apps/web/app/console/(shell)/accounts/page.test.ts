import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { resolveActorMock, listAccountsMock, redirectMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listAccountsMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ listAccounts: listAccountsMock }));
// `AccountsTable` ("use client") usa `useRouter`/`useSearchParams` — sem
// contexto de app router de verdade neste teste (renderToStaticMarkup puro),
// então o módulo é substituído, como no precedente de `create-event-wizard.test.tsx`.
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import AccountsPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function montarConta(overrides: {
  id?: string;
  maskedEmail?: string;
  type?: "host" | "vendor";
  plan?: string | null;
  status?: "trial" | "active" | "suspended" | "churned";
  eventCount?: number;
  createdAt?: Date;
  lastAccessAtValue?: Date | null;
} = {}) {
  return {
    id: overrides.id ?? "conta-1",
    maskedEmail: overrides.maskedEmail ?? "j••••@gmail.com",
    type: overrides.type ?? ("host" as const),
    plan: overrides.plan ?? "free",
    status: overrides.status ?? ("active" as const),
    eventCount: overrides.eventCount ?? 1,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00Z"),
    lastAccessAt: {
      value: overrides.lastAccessAtValue ?? new Date("2026-01-02T00:00:00Z"),
      approximate: true as const,
      approximationBasis:
        "aproximado por último login (host_sessions.created_at) — não é a última ação, porque accounts não guarda last_used_at de host",
    },
  };
}

async function paginaComContas(searchParams: Record<string, string>, contas: ReturnType<typeof montarConta>[]) {
  resolveActorMock.mockResolvedValueOnce(actor());
  listAccountsMock.mockResolvedValueOnce({ rows: contas, nextCursor: null });

  const element = await AccountsPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(element);
}

describe("AccountsPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("e-mail aparece mascarado, nunca cru", async () => {
    const serializado = await paginaComContas({}, [
      montarConta({ maskedEmail: "j••••@gmail.com" }),
    ]);

    expect(serializado).toContain("j••••@gmail.com");
    expect(serializado).not.toMatch(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("coluna diz 'Último login', nunca 'Último acesso'", async () => {
    const serializado = await paginaComContas({}, [montarConta()]);

    expect(serializado).toContain("Último login");
    expect(serializado).not.toContain("Último acesso");
  });

  it("contagem exibida reflete o conjunto filtrado (2 linhas), não um total maior não passado ao componente", async () => {
    const serializado = await paginaComContas({}, [montarConta({ id: "conta-1" }), montarConta({ id: "conta-2" })]);

    expect(serializado).toContain("2 contas");
    expect(serializado).not.toContain("3 contas");
  });

  it("sem ator resolvido, redireciona para /console/login sem chamar listAccounts", async () => {
    resolveActorMock.mockResolvedValueOnce(null);

    await expect(AccountsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(listAccountsMock).not.toHaveBeenCalled();
  });
});
