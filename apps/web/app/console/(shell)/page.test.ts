import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricCard } from "@albora/ui-web";

const { resolveActorMock, getPlatformOverviewMock, getPlatformRevenueMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getPlatformOverviewMock: vi.fn(),
  getPlatformRevenueMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  getPlatformOverview: getPlatformOverviewMock,
  getPlatformRevenue: getPlatformRevenueMock,
}));

import ConsolePage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function revenueBase() {
  return {
    mrrCents: 0,
    activeSubscriptions: 0,
    overdueCount: 0,
    churned30d: { value: 0, approximate: true as const, approximationBasis: "última atualização do registro" },
    vendorsByPlan: [],
  };
}

function overviewBase() {
  return {
    h1: { current: null, baseline: null },
    h1Series: [],
    eventsActive: { current: 0, baseline: null },
    guestsReached: { current: 0, baseline: null },
    photos: { current: 0, baseline: null },
    openTickets: 0,
    funnel: [],
  };
}

describe("ConsolePage", () => {
  it("métrica aproximada (churn de fornecedor) renderiza ≈ e a base da aproximação", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce(overviewBase());
    getPlatformRevenueMock.mockResolvedValueOnce({
      ...revenueBase(),
      churned30d: {
        value: 3,
        approximate: true,
        approximationBasis: "base-de-teste-para-verificar-marcador",
      },
    });

    const element = await ConsolePage();
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("≈");
    expect(serializado).toContain("base-de-teste-para-verificar-marcador");
  });

  it("H1 sem baseline honesto mostra — e 'sem período anterior', sem seta de tendência", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce(overviewBase());
    getPlatformRevenueMock.mockResolvedValueOnce(revenueBase());

    const element = await ConsolePage();
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("sem período anterior");
    expect(serializado).toContain("—");
    expect(serializado).not.toContain("↑");
    expect(serializado).not.toContain("↓");
  });

  it("cartão com bomQuando 'desce' e delta positivo pinta como ruim (crítico), não como bom", () => {
    // Mesmos props usados em ConsolePage para "Tickets abertos": bomQuando="desce"
    // porque tickets abertos subindo é ruim — o sinal do delta não decide sozinho.
    const element = MetricCard({
      rotulo: "Tickets abertos",
      valor: "12",
      valorNumerico: 12,
      anterior: 4,
      bomQuando: "desce",
      janela: "Agora",
    });
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("var(--critico)");
    expect(serializado).not.toContain("var(--acento)");
  });

  it("degrau do funil com maior perda recebe o destaque de --critico", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce({
      ...overviewBase(),
      h1: { current: 0.42, baseline: 0.38 },
      h1Series: [{ date: "2026-09-01", rate: 0.4 }],
      funnel: [
        { etapa: "qr_scan", sessoes: 100, retencao: null },
        { etapa: "consent", sessoes: 90, retencao: 0.9 },
        { etapa: "capture", sessoes: 20, retencao: 20 / 90 },
      ],
    });
    getPlatformRevenueMock.mockResolvedValueOnce(revenueBase());

    const element = await ConsolePage();
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("var(--critico)");
    expect(serializado).toContain("capture");
  });

  it("saúde operacional com zero falhas de cobrança não renderiza a área de falhas", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getPlatformOverviewMock.mockResolvedValueOnce(overviewBase());
    getPlatformRevenueMock.mockResolvedValueOnce({ ...revenueBase(), overdueCount: 0 });

    const element = await ConsolePage();
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("Sem falha de cobrança agora");
    expect(serializado).not.toContain("precisa de ação");
  });
});
