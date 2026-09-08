import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirectMock,
  resolveActorMock,
  getActiveImpersonationForStaffMock,
  listPendingImpersonationRequestsMock,
} = vi.hoisted(() => ({
  // Igual ao `notFound` mockado em accounts/[id]/page.test.ts: `redirect`
  // de verdade lança pra interromper o render — sem isso o código depois
  // do `if (!actor) redirect(...)` rodaria com `actor` null.
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
  resolveActorMock: vi.fn(),
  getActiveImpersonationForStaffMock: vi.fn(),
  listPendingImpersonationRequestsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  getActiveImpersonationForStaff: getActiveImpersonationForStaffMock,
  listPendingImpersonationRequests: listPendingImpersonationRequestsMock,
}));
vi.mock("@/features/console/components/server/console-shell", () => ({
  ConsoleShell: ({ children }: { children: unknown }) => children,
}));

import ConsoleLayout from "./layout";

function actor(roles: string[]) {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

beforeEach(() => {
  redirectMock.mockClear();
  resolveActorMock.mockReset();
  getActiveImpersonationForStaffMock.mockReset();
  listPendingImpersonationRequestsMock.mockReset();
});

describe("ConsoleLayout", () => {
  it("sem ator redireciona para /console/login", async () => {
    resolveActorMock.mockResolvedValueOnce(null);
    await expect(ConsoleLayout({ children: null })).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/console/login");
  });

  it("repassa a impersonação ativa do ator para o shell", async () => {
    resolveActorMock.mockResolvedValueOnce(actor(["support"]));
    getActiveImpersonationForStaffMock.mockResolvedValueOnce({
      id: "imp-1",
      targetAccountId: "conta-9",
      expiresAt: new Date(),
    });
    const element = await ConsoleLayout({ children: null });
    expect(JSON.stringify(element)).toContain("imp-1");
  });

  it("support não busca pedidos pendentes — capacidade é só do dono", async () => {
    resolveActorMock.mockResolvedValueOnce(actor(["support"]));
    getActiveImpersonationForStaffMock.mockResolvedValueOnce(null);
    await ConsoleLayout({ children: null });
    expect(listPendingImpersonationRequestsMock).not.toHaveBeenCalled();
  });

  it("owner busca pedidos pendentes (via executeQuery, com o actor) e repassa pro shell", async () => {
    resolveActorMock.mockResolvedValueOnce(actor(["owner"]));
    getActiveImpersonationForStaffMock.mockResolvedValueOnce(null);
    listPendingImpersonationRequestsMock.mockResolvedValueOnce([
      { id: "imp-2", requesterStaffId: "s2", targetAccountId: "conta-3", reason: "ticket", createdAt: new Date() },
    ]);
    const element = await ConsoleLayout({ children: null });
    expect(listPendingImpersonationRequestsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ actor: actor(["owner"]) }),
    );
    expect(JSON.stringify(element)).toContain("imp-2");
  });
});

describe("ConsoleLayout — preferência de largura", () => {
  it("cookie recolhido chega ao shell — é o que evita a piscada de largura", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: (nome: string) => (nome === "albora_console_sidebar" ? { value: "recolhida" } : undefined) }),
    }));
    resolveActorMock.mockResolvedValueOnce(actor(["support"]));
    getActiveImpersonationForStaffMock.mockResolvedValueOnce(null);

    const { default: Layout } = await import("./layout");
    const element = await Layout({ children: null });

    expect((element as { props: { recolhidaInicial: boolean } }).props.recolhidaInicial).toBe(true);
    vi.resetModules();
  });
});
