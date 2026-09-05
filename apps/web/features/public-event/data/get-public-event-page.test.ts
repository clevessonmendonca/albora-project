import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  withEvent: vi.fn(),
  refDoEvento: vi.fn(),
  resolverSlug: vi.fn(),
  lerMetricasAoVivo: vi.fn(),
  listarMidiaDaParede: vi.fn(),
}));
vi.mock("@albora/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@albora/db")>();
  return {
    ...actual,
    withEvent: db.withEvent,
    refDoEvento: db.refDoEvento,
    resolverSlug: db.resolverSlug,
    lerMetricasAoVivo: db.lerMetricasAoVivo,
    listarMidiaDaParede: db.listarMidiaDaParede,
  };
});
vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/r2", () => ({ signGet: vi.fn(async () => "https://example.invalid/thumb.jpg") }));

const { getPublicEventPage, CTA_LANDING } = await import("./get-public-event-page");

const eventoBase = {
  eventoId: "e1",
  packId: "inexistente",
  comecaEm: new Date("2026-09-05T20:00:00Z"),
  terminaEm: new Date("2026-09-06T02:00:00Z"),
  interacaoAbreEm: null,
  identityTokens: {},
  filtroRecomendado: null,
  fuso: "America/Sao_Paulo",
  vendorBrandTokens: null,
  coverImageKey: null,
  title: null,
  status: "active" as const,
};

describe("getPublicEventPage — ctaHref com ref", () => {
  beforeEach(() => {
    db.withEvent.mockImplementation(
      async (_pool: unknown, _id: string, fn: (c: unknown) => Promise<unknown>) => fn({}),
    );
    db.resolverSlug.mockResolvedValue({ estado: "aberto", evento: eventoBase });
    db.lerMetricasAoVivo.mockResolvedValue({ totalFotos: 0, sessoesComUpload: 0 });
    db.listarMidiaDaParede.mockResolvedValue([]);
  });

  it("com ref, CTA aponta para a landing com ?ref=", async () => {
    db.refDoEvento.mockResolvedValue("p".repeat(24));
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(`/?ref=${"p".repeat(24)}`);
  });

  it("sem ref, CTA aponta para a landing pura", async () => {
    db.refDoEvento.mockResolvedValue(null);
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(CTA_LANDING);
  });

  it("falha ao ler ref não derruba a página", async () => {
    db.refDoEvento.mockRejectedValue(new Error("rls"));
    const dados = await getPublicEventPage("festa-demo");
    expect(dados?.ctaHref).toBe(CTA_LANDING);
  });
});
