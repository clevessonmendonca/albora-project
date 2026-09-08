import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MetricCard } from "@albora/ui-web";
import type { PlatformOverview, PlatformRevenue } from "@albora/application";

const {
  resolveActorMock,
  getPlatformOverviewMock,
  getPlatformRevenueMock,
  getConsoleAttentionMock,
  listLiveEventsMock,
} = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getPlatformOverviewMock: vi.fn(),
  getPlatformRevenueMock: vi.fn(),
  getConsoleAttentionMock: vi.fn(),
  listLiveEventsMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  getPlatformOverview: getPlatformOverviewMock,
  getPlatformRevenue: getPlatformRevenueMock,
  getConsoleAttention: getConsoleAttentionMock,
  listLiveEvents: listLiveEventsMock,
}));

import ConsolePage from "./page";

function actor(roles: string[] = ["owner"]) {
  return { staffUserId: "s1", roles, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function revenueBase(): PlatformRevenue {
  return {
    mrrCents: 0,
    activeSubscriptions: 0,
    overdueCount: 0,
    churned30d: { value: 0, approximate: true as const, approximationBasis: "última atualização do registro" },
    vendorsByPlan: [],
  };
}

function overviewBase(): PlatformOverview {
  return {
    h1: { current: null, baseline: null },
    h1Series: [],
    eventsActive: { current: 0, baseline: null },
    guestsReached: { current: 0, baseline: null },
    photos: { current: 0, baseline: null },
    openTickets: 0,
    funnel: [],
    commercialFunnel: [],
  };
}

type Cenario = {
  roles?: string[];
  periodo?: string;
  overview?: Partial<PlatformOverview>;
  revenue?: Partial<PlatformRevenue>;
  pendencias?: unknown[];
  aoVivo?: unknown[];
};

async function renderizar(cenario: Cenario = {}) {
  resolveActorMock.mockResolvedValueOnce(actor(cenario.roles));
  getPlatformOverviewMock.mockResolvedValueOnce({ ...overviewBase(), ...cenario.overview });
  getPlatformRevenueMock.mockResolvedValueOnce({ ...revenueBase(), ...cenario.revenue });
  getConsoleAttentionMock.mockResolvedValueOnce(cenario.pendencias ?? []);
  listLiveEventsMock.mockResolvedValueOnce({ rows: cenario.aoVivo ?? [] });
  const searchParams = Promise.resolve(cenario.periodo ? { periodo: cenario.periodo } : {});
  return renderToStaticMarkup(await ConsolePage({ searchParams }));
}

describe("ConsolePage — atenção primeiro", () => {
  it("sem pendência mostra 'tudo em dia' honesto, não uma fila vazia sem explicação", async () => {
    const html = await renderizar();
    expect(html).toContain("Precisa de você agora");
    expect(html).toContain("Tudo em dia");
  });

  it("pendência crítica aparece com o título, o módulo e o caminho para a tela dedicada", async () => {
    const html = await renderizar({
      pendencias: [
        {
          id: "suporte-sla",
          severidade: "critico",
          titulo: "2 ticket(s) estouraram o SLA",
          detalhe: "o mais antigo venceu há 6h20",
          modulo: "Suporte",
          href: "/console/support",
        },
      ],
    });
    expect(html).toContain("2 ticket(s) estouraram o SLA");
    expect(html).toContain("/console/support");
    expect(html).not.toContain("Tudo em dia");
  });

  it("evento ao vivo é monitoramento, nunca linha da fila de ação", async () => {
    const html = await renderizar({
      aoVivo: [{ id: "ev-1", title: "Festa da firma", h1: 0.44, totalFotos: 247 }],
    });
    expect(html).toContain("Acontecendo agora");
    expect(html).toContain("Festa da firma");
    expect(html).toContain("Tudo em dia");
  });
});

describe("ConsolePage — H1", () => {
  it("sem denominador honesto mostra — e nunca 0%", async () => {
    const html = await renderizar();
    expect(html).toContain("—");
    expect(html).not.toContain(">0%<");
  });

  it("explica o cálculo em texto sempre presente, não só no hover", async () => {
    const html = await renderizar({ overview: { h1: { current: 0.44, baseline: 0.4 } } });
    expect(html).toContain("44%");
    expect(html).toContain("% de convidados esperados que enviaram ≥1 foto");
    expect(html).toContain("Meta ≥40%");
  });
});

describe("ConsolePage — funil comercial", () => {
  it("destaca a maior perda de verdade, não o último degrau", async () => {
    const html = await renderizar({
      overview: {
        commercialFunnel: [
          { etapa: "account_created", eventos: 1240, retencao: null },
          { etapa: "event_created", eventos: 890, retencao: 890 / 1240 },
          { etapa: "qr_downloaded", eventos: 812, retencao: 812 / 890 },
          { etapa: "checkout_started", eventos: 640, retencao: 640 / 812 },
          { etapa: "checkout_paid", eventos: 512, retencao: 512 / 640 },
        ],
      },
    });
    expect(html).toContain("Maior perda: Contas → Eventos");
    expect(html).not.toContain("Maior perda: Checkout → Pago");
  });

  it("mostra o funil comercial e não a espinha do convidado — funil de uso é do detalhe do evento", async () => {
    const html = await renderizar({
      overview: {
        funnel: [
          { etapa: "qr_scan", sessoes: 100, retencao: null },
          { etapa: "capture", sessoes: 20, retencao: 0.2 },
        ],
        commercialFunnel: [{ etapa: "account_created", eventos: 10, retencao: null }],
      },
    });
    expect(html).toContain("Ativação comercial");
    expect(html).not.toContain("qr_scan");
    expect(html).not.toContain("capture");
  });
});

describe("ConsolePage — período", () => {
  it("período ausente usa 30 dias", async () => {
    await renderizar();
    expect(getPlatformOverviewMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ days: 30 }));
  });

  it("período inválido na URL não vira janela inventada — cai no padrão", async () => {
    await renderizar({ periodo: "1000d" });
    expect(getPlatformOverviewMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ days: 30 }));
  });

  it("7d de fato muda a janela consultada", async () => {
    await renderizar({ periodo: "7d" });
    expect(getPlatformOverviewMock).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ days: 7 }));
  });
});

describe("ConsolePage — capacidade", () => {
  it("sem events.read não consulta eventos ao vivo", async () => {
    listLiveEventsMock.mockClear();
    await renderizar({ roles: ["finance"] });
    expect(listLiveEventsMock).not.toHaveBeenCalled();
  });
});

describe("MetricCard", () => {
  it("bomQuando 'desce' com delta positivo pinta como ruim (crítico), não como bom", () => {
    const element = MetricCard({
      rotulo: "Tickets abertos",
      valor: "12",
      valorNumerico: 12,
      anterior: 4,
      bomQuando: "desce",
      janela: "Agora",
    });
    expect(renderToStaticMarkup(element)).toContain("var(--critico)");
  });
});
