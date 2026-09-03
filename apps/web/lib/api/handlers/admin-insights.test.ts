import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

const ACCOUNT_ID = "22222222-2222-2222-2222-222222222222";
const EVENT_ID = "11111111-1111-1111-1111-111111111111";

const { requireConfig, requireHostSession, requireHostEvent } = vi.hoisted(() => ({
  requireConfig: vi.fn(() => null),
  requireHostSession: vi.fn(),
  requireHostEvent: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof ApiModule>();
  return { ...actual, requireConfig, requireHostSession, requireHostEvent };
});

const { withEvent, fotosPorMissao, fotosPorHora } = vi.hoisted(() => ({
  withEvent: vi.fn(),
  fotosPorMissao: vi.fn(),
  fotosPorHora: vi.fn(),
}));

vi.mock("@albora/db", () => ({ withEvent, fotosPorMissao, fotosPorHora }));

vi.mock("@albora/packs", () => ({
  PACKS: { casamento: { id: "casamento" } },
  resolvePackText: vi.fn(() => "Missão traduzida"),
}));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

const { getEventInsights, getGuestMetrics } = vi.hoisted(() => ({
  getEventInsights: vi.fn(),
  getGuestMetrics: vi.fn(),
}));

vi.mock("@/lib/application/use-cases/admin", () => ({
  getEventInsights,
  getGuestMetrics,
}));

const { GET, getInsightsCsv } = await import("./admin-insights");

function params() {
  return { params: Promise.resolve({ eventId: EVENT_ID }) };
}

function getReq(path = "insights") {
  return new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/${path}`);
}

const EVENTO_BASE = {
  packId: "casamento",
  fuso: "America/Sao_Paulo",
  slug: "ana-e-joao",
  expectedGuests: 100,
  actualGuests: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "admin@exemplo.test" },
  });
  requireHostEvent.mockResolvedValue({ evento: EVENTO_BASE });
  withEvent.mockImplementation(async (_pool, _id, fn: (c: unknown) => unknown) => fn({}));
  fotosPorMissao.mockResolvedValue([]);
  fotosPorHora.mockResolvedValue([]);
});

describe("GET /api/admin/events/:eventId/insights", () => {
  it("401/403 quando não autenticado", async () => {
    requireHostSession.mockResolvedValue(
      new Response(null, { status: 401 }),
    );
    const res = await GET(getReq(), params());
    expect(res.status).toBe(401);
  });

  it("404 quando o evento não pertence ao host", async () => {
    requireHostEvent.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await GET(getReq(), params());
    expect(res.status).toBe(404);
  });

  it("200 com missões e horas serializadas", async () => {
    fotosPorMissao.mockResolvedValue([
      { challengeId: "c1", titleKey: "missao.x", customTitle: null, emoji: "🎉", fotos: 10 },
    ]);
    fotosPorHora.mockResolvedValue([{ hora: 20, fotos: 5 }]);

    const res = await GET(getReq(), params());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { missoes: unknown[]; horas: unknown[] };
    expect(body.missoes).toHaveLength(1);
    expect(body.horas).toEqual([{ hora: 20, fotos: 5 }]);
  });
});

const RESUMO_BASE = {
  expectedGuests: 100,
  denominador: 100,
  origemDoDenominador: "convidados_esperados",
  totalSessoes: 80,
  sessoesComUpload: 60,
  totalFotos: 240,
  sharesTotais: 15,
  participacao: 0.6,
  veredito: "funil.tese_validada",
  intencao: { codigo: "quis_e_conseguiu" },
  degraus: [
    { etapa: "qr_scan", sessoes: 80, retencao: null },
    { etapa: "capture", sessoes: 60, retencao: 0.75 },
  ],
  uploadsAntesDoFeed: 150,
  uploadsDepoisDoFeed: 90,
  entradasPorVia: { qr: 40, wa: 20, link: 15, code: 5 },
  ultimas: [{ id: "foto-1", criadaEm: "2026-09-01T00:00:00.000Z", thumb: "https://r2/thumb" }],
  sessoes: [{ id: "s1", nome: "João da Silva", fotos: 3 }],
};

describe("GET /api/admin/events/:eventId/insights/csv", () => {
  beforeEach(() => {
    getEventInsights.mockResolvedValue({
      missoes: [{ challengeId: "c1", titulo: "Foto com o bolo", emoji: "🎂", fotos: 22 }],
      horas: [{ hora: 20, fotos: 12 }],
    });
    getGuestMetrics.mockResolvedValue(RESUMO_BASE);
  });

  it("401/403 quando não autenticado", async () => {
    requireHostSession.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    expect(res.status).toBe(401);
  });

  it("404 quando o evento não pertence ao host", async () => {
    requireHostEvent.mockResolvedValue(new Response(null, { status: 404 }));
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    expect(res.status).toBe(404);
  });

  it("200 com content-type e content-disposition de CSV anexado", async () => {
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toBe(
      'attachment; filename="insights-ana-e-joao.csv"',
    );
  });

  it("BOM UTF-8 na frente do corpo (bytes EF BB BF)", async () => {
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("inclui métricas agregadas do resumo e das missões/horas", async () => {
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    const text = await res.text();
    expect(text).toContain("Resumo geral");
    expect(text).toContain("Sessões com upload,60");
    expect(text).toContain("Participação (%),60");
    expect(text).toContain("Jornada do convidado");
    expect(text).toContain("QR escaneado,80,");
    expect(text).toContain("Tirou foto,60,75");
    expect(text).toContain("Canais de entrada");
    expect(text).toContain("QR impresso,40");
    expect(text).toContain("Missões mais fotografadas");
    expect(text).toContain("1,Foto com o bolo,22");
    expect(text).toContain("Fotos por hora");
    expect(text).toContain("20h,12");
  });

  it("nunca inclui nome de convidado nem thumb de foto (LGPD — só agregado)", async () => {
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    const text = await res.text();
    expect(text).not.toContain("João da Silva");
    expect(text).not.toContain("https://r2/thumb");
  });

  it("500 quando o use case falha", async () => {
    getGuestMetrics.mockRejectedValue(new Error("boom"));
    const res = await getInsightsCsv(getReq("insights/csv"), params());
    expect(res.status).toBe(500);
  });
});
