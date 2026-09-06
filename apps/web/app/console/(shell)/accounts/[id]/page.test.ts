import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, getAccountMock, RevealPiiButtonMock, DeleteAccountDangerMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getAccountMock: vi.fn(),
  // Mock só pra identidade (comparado por referência abaixo) — evita puxar
  // a cadeia real de `reveal-pii-button.tsx` -> `@/features/console/actions`
  // -> `@albora/db`/`@/lib/email` só pra testar o gate de capacidade.
  RevealPiiButtonMock: vi.fn(() => null),
  DeleteAccountDangerMock: vi.fn(() => null),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ getAccount: getAccountMock }));
vi.mock("@/features/console/components/client/reveal-pii-button", () => ({
  RevealPiiButton: RevealPiiButtonMock,
}));
vi.mock("@/features/console/components/client/delete-account-danger", () => ({
  DeleteAccountDanger: DeleteAccountDangerMock,
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import AccountDetailPage from "./page";
import { RevealPiiButton } from "@/features/console/components/client/reveal-pii-button";
import { DeleteAccountDanger } from "@/features/console/components/client/delete-account-danger";

/** `<>{EntityHeader}{div}</>` — `actions` é prop do primeiro filho do Fragment. */
function acoesDoCabecalho(pageElement: unknown): { type: unknown; props?: { children?: unknown } } | undefined {
  const el = pageElement as { props: { children: Array<{ props: { actions?: { type: unknown; props?: { children?: unknown } } } }> } };
  return el.props.children[0]?.props.actions;
}

/** Quando as duas capacidades se aplicam, `actions` é um Fragment com os dois botões como filhos. */
function tiposDosFilhos(acoes: { type: unknown; props?: { children?: unknown } } | undefined): unknown[] {
  const filhos = acoes?.props?.children;
  const lista = Array.isArray(filhos) ? filhos : [filhos];
  return lista.map((f) => (f as { type: unknown } | undefined)?.type);
}

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

  it("com accounts.pii.reveal mostra o botão de revelar contato", async () => {
    resolveActorMock.mockResolvedValueOnce({ ...actor(), roles: ["support"] });
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    expect(acoesDoCabecalho(element)?.type).toBe(RevealPiiButton);
  });

  it("sem accounts.pii.reveal não mostra o botão", async () => {
    resolveActorMock.mockResolvedValueOnce({ ...actor(), roles: ["engineering"] });
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    expect(acoesDoCabecalho(element)).toBeUndefined();
  });

  it("com lgpd.delete_account (e accounts.pii.reveal) mostra os dois botões — compliance tem as duas capacidades", async () => {
    resolveActorMock.mockResolvedValueOnce({ ...actor(), roles: ["compliance"] });
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    const acoes = acoesDoCabecalho(element);
    expect(tiposDosFilhos(acoes)).toEqual([RevealPiiButton, DeleteAccountDanger]);
  });

  it("sem lgpd.delete_account (support só tem accounts.pii.reveal) não mostra o botão de excluir", async () => {
    resolveActorMock.mockResolvedValueOnce({ ...actor(), roles: ["support"] });
    getAccountMock.mockResolvedValueOnce(contaBase());

    const element = await AccountDetailPage({ params: Promise.resolve({ id: "acc-1" }) });
    // `support` não tem `lgpd.delete_account` — `actions` continua sendo só o
    // botão de revelar (elemento isolado, não um Fragment com dois filhos).
    expect(acoesDoCabecalho(element)?.type).toBe(RevealPiiButton);
  });
});
