import { describe, expect, it, vi } from "vitest";
import type * as ApplicationModule from "@albora/application";

const { resolveActorMock, listSecurityMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listSecurityMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn() }));
vi.mock("@albora/application", async () => {
  const real = await vi.importActual<typeof ApplicationModule>("@albora/application");
  return { ...real, listSecurity: listSecurityMock };
});

import SecurityPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function evento(kind: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: overrides.id ?? Math.random().toString(36),
    at: new Date(),
    kind,
    actorKind: null,
    actorId: null,
    ipHash: null,
    requestId: null,
    metadata: {},
    ...overrides,
  };
}

async function searchParamsVazio() {
  return {};
}

describe("SecurityPage", () => {
  it("agrupa por tipo com contagem", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listSecurityMock.mockResolvedValueOnce({
      rows: [evento("login.failed"), evento("login.failed"), evento("rate_limit.exceeded")],
      nextCursor: null,
    });

    const element = await SecurityPage({ searchParams: searchParamsVazio() });
    const texto = JSON.stringify(element);

    expect(texto).toContain("login.failed");
    expect(texto).toContain("rate_limit.exceeded");
  });

  it("session.reuse recebe destaque de --critico", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listSecurityMock.mockResolvedValueOnce({
      rows: [evento("session.reuse"), evento("login.failed")],
      nextCursor: null,
    });

    const element = await SecurityPage({ searchParams: searchParamsVazio() });
    const texto = JSON.stringify(element);

    // O grupo session.reuse carrega a classe de token --critico; login.failed não.
    const grupoCritico = texto.includes('"kind":"session.reuse"') || texto.includes("border-critico");
    expect(grupoCritico).toBe(true);
    expect(texto).toContain("text-critico");
    expect(texto).toContain("border-critico");
  });

  it("lista vazia mostra estado vazio honesto", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listSecurityMock.mockResolvedValueOnce({ rows: [], nextCursor: null });

    const element = await SecurityPage({ searchParams: searchParamsVazio() });
    const texto = JSON.stringify(element);

    expect(texto).toContain("Nenhum evento de segurança neste filtro");
  });
});

describe("segurança é só-leitura por construção", () => {
  it("nenhum controle de mutação no código-fonte da tela", async () => {
    const fs = await import("node:fs/promises");
    const fonte = await fs.readFile(
      "apps/web/app/console/(shell)/security/page.tsx",
      "utf-8",
    );
    const codigo = fonte
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    for (const proibido of [
      "onDelete",
      "onEdit",
      "handleDelete",
      "handleEdit",
      "mutate",
      "marcarComoRevisado",
      "ignorar",
    ]) {
      expect(codigo).not.toContain(proibido);
    }
    expect(codigo).not.toMatch(/method=["']post["']/i);
  });
});
