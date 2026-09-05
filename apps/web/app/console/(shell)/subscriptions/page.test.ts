import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const {
  resolveActorMock,
  listSubscriptionsMock,
  getPlatformRevenueMock,
  redirectMock,
  SubscriptionActionsMock,
} = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listSubscriptionsMock: vi.fn(),
  getPlatformRevenueMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
  // Mock só pra identidade — a T6 já testa o componente sozinho
  // (subscription-actions.test.tsx); aqui só interessa o gate de capacidade.
  SubscriptionActionsMock: vi.fn((_props: Record<string, unknown>) => null),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  listSubscriptions: listSubscriptionsMock,
  getPlatformRevenue: getPlatformRevenueMock,
  VENDOR_PLAN_PRICE_CENTS: { starter: 9900, studio: 24900, agency: 59900 },
}));
vi.mock("@/features/console/components/client/subscription-actions", () => ({
  SubscriptionActions: SubscriptionActionsMock,
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import SubscriptionsPage from "./page";

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

const OVERDUE_BASIS =
  "aproximado por now() - updated_at (vendor_subscriptions não tem overdue_since dedicado) — só é exato se nada mais tocar updated_at enquanto a assinatura segue em atraso";
const CHURN_BASIS = "última atualização do registro (sem canceled_at dedicado)";

function montarAssinatura(overrides: {
  vendorId?: string;
  vendorName?: string;
  subscriptionId?: string;
  asaasSubscriptionId?: string;
  plan?: "starter" | "studio" | "agency";
  status?: "pending" | "active" | "overdue" | "canceled";
  overdueDaysValue?: number | null;
} = {}) {
  const overdueDaysValue = overrides.overdueDaysValue === undefined ? null : overrides.overdueDaysValue;
  return {
    vendorId: overrides.vendorId ?? "vendor-1",
    vendorName: overrides.vendorName ?? "Estúdio X",
    subscriptionId: overrides.subscriptionId ?? "sub-row-1",
    asaasSubscriptionId: overrides.asaasSubscriptionId ?? "sub-asaas-row-1",
    plan: overrides.plan ?? ("studio" as const),
    status: overrides.status ?? ("active" as const),
    nextChargeAt: null,
    overdueDays:
      overdueDaysValue === null
        ? null
        : { value: overdueDaysValue, approximate: true as const, approximationBasis: OVERDUE_BASIS },
  };
}

function revenuePadrao(overrides: { overdueCount?: number; churned30dValue?: number } = {}) {
  return {
    mrrCents: 24900,
    activeSubscriptions: 1,
    overdueCount: overrides.overdueCount ?? 0,
    churned30d: { value: overrides.churned30dValue ?? 0, approximate: true as const, approximationBasis: CHURN_BASIS },
    vendorsByPlan: [{ plan: "studio", count: 1 }],
  };
}

async function pagina(
  assinaturas: ReturnType<typeof montarAssinatura>[],
  revenue = revenuePadrao(),
  quemAcessa = actor(),
) {
  resolveActorMock.mockResolvedValueOnce(quemAcessa);
  listSubscriptionsMock.mockResolvedValueOnce({ rows: assinaturas, nextCursor: null });
  getPlatformRevenueMock.mockResolvedValueOnce(revenue);

  const element = await SubscriptionsPage();
  return renderToStaticMarkup(element);
}

describe("SubscriptionsPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("coluna 'próxima cobrança' renderiza sempre — , nunca uma data estimada", async () => {
    const serializado = await pagina([montarAssinatura()]);

    expect(serializado).toContain("Próxima cobrança");
    expect(serializado).toContain("—");
    expect(serializado).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("inadimplência aparece como contagem, e o texto não contém símbolo de moeda", async () => {
    const serializado = await pagina([montarAssinatura()], revenuePadrao({ overdueCount: 3 }));

    expect(serializado).toContain("3 assinatura(s)");
    expect(serializado).not.toContain("R$ 3");
    const cartaoInadimplencia = serializado.match(/Inadimplência[\s\S]{0,200}/)?.[0] ?? "";
    expect(cartaoInadimplencia).not.toContain("R$");
  });

  it("churn 30d renderiza ≈ e a base da aproximação", async () => {
    const serializado = await pagina([montarAssinatura()], revenuePadrao({ churned30dValue: 2 }));

    expect(serializado).toContain("≈ 2");
    expect(serializado).toContain(CHURN_BASIS);
  });

  it("atraso renderiza ≈ e a base da aproximação, quando há assinatura em atraso", async () => {
    const serializado = await pagina([
      montarAssinatura({ status: "overdue", overdueDaysValue: 3 }),
    ]);

    expect(serializado).toContain("≈ 3d");
    expect(serializado).toContain(OVERDUE_BASIS);
  });

  it("sem assinatura em atraso, coluna mostra — e nenhuma base de aproximação de atraso aparece", async () => {
    const serializado = await pagina([montarAssinatura({ status: "active", overdueDaysValue: null })]);

    expect(serializado).not.toContain(OVERDUE_BASIS);
  });

  it("ator sem subscription.mutate e sem subscription.refund* não vê a coluna de ações", async () => {
    // compliance tem accounts/lgpd/retention/audit/security — nenhuma capacidade de assinatura (roles.ts).
    const serializado = await pagina(
      [montarAssinatura({ status: "overdue", overdueDaysValue: 1 })],
      revenuePadrao(),
      actor(["compliance"]),
    );

    expect(serializado).not.toContain("Ações");
    expect(SubscriptionActionsMock).not.toHaveBeenCalled();
  });

  it("dono vê a coluna de ações e o componente recebe subscriptionId/plan/capacidades corretos", async () => {
    const serializado = await pagina(
      [montarAssinatura({ subscriptionId: "sub-abc", vendorId: "vendor-abc", plan: "agency" })],
      revenuePadrao(),
      actor(["owner"]),
    );

    expect(serializado).toContain("Ações");
    expect(SubscriptionActionsMock.mock.calls[0]?.[0]).toMatchObject({
      subscriptionId: "sub-abc",
      vendorId: "vendor-abc",
      plan: "agency",
      podeMutar: true,
      podeReembolsar: true,
    });
  });

  it("financeiro (subscription.mutate + subscription.refund, sem refund.approve) também vê a coluna", async () => {
    const serializado = await pagina([montarAssinatura()], revenuePadrao(), actor(["finance"]));
    expect(serializado).toContain("Ações");
  });

  it("sem ator resolvido, redireciona para /console/login sem chamar listSubscriptions", async () => {
    resolveActorMock.mockResolvedValueOnce(null);

    await expect(SubscriptionsPage()).rejects.toThrow("redirect");
    expect(listSubscriptionsMock).not.toHaveBeenCalled();
  });
});
