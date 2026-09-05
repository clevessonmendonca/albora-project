import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, getAccountMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getAccountMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ getAccount: getAccountMock }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import AccountDetailPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function contaBase() {
  return {
    id: "acc-1",
    maskedEmail: "an••••@exemplo.test",
    type: "host" as const,
    plan: "celebration",
    status: "active" as const,
    eventCount: 1,
    createdAt: new Date("2026-01-01"),
    lastAccessAt: { value: null, approximate: true as const, approximationBasis: "aproximado por último login" },
    events: [{ id: "ev-1", title: "Festa", startsAt: new Date("2026-06-01"), status: "active" }],
    consentsByVersion: [{ versao: "v1", aceites: 1, primeiroEm: new Date(), ultimoEm: new Date() }],
    auditTrail: [],
  };
}

describe("AccountDetailPage", () => {
  it("conta inexistente chama notFound", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce(null);
    await expect(AccountDetailPage({ params: Promise.resolve({ id: "x" }) })).rejects.toThrow("notFound");
  });

  it("renderiza os três painéis com dado real", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("Identidade");
    expect(texto).toContain("Atividade");
    expect(texto).toContain("Trilha");
  });

  it("e-mail aparece mascarado, nunca cru", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce({
      ...contaBase(),
      maskedEmail: "an••••@exemplo.test",
    });

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("an••••@exemplo.test");
    expect(texto).not.toContain("anfitriao-a@exemplo.test");
  });

  it("painel Trilha lista entradas de auditoria da conta", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce({
      ...contaBase(),
      auditTrail: [
        {
          id: "audit-1",
          at: new Date("2026-02-01T10:00:00Z"),
          actorKind: "staff" as const,
          actorId: "staff-1",
          actorLabel: "suporte",
          action: "accounts.pii.reveal",
          targetKind: "account" as const,
          targetId: "acc-1",
          reason: "atendimento de suporte",
          metadata: {},
          requestId: null,
          ipHash: null,
        },
      ],
    });

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("accounts.pii.reveal");
    expect(texto).toContain("atendimento de suporte");
  });

  it("painel Trilha sem entradas mostra estado vazio honesto, não erro", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce({ ...contaBase(), auditTrail: [] });

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("Nenhuma ação da equipe registrada ainda");
  });

  it("consentimentos aparecem como contagem agregada, sem nome de convidado", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("v1");
    expect(texto).toContain("aceite(s)");
    expect(texto).not.toContain("convidado-");
  });
});
