import { describe, expect, it, vi } from "vitest";

const { resolveActorMock, getEventMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  getEventMock: vi.fn(),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({ getEvent: getEventMock }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("notFound");
  }),
}));

import EventDetailPage from "./page";

function actor() {
  return { staffUserId: "s1", roles: ["owner"], sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function eventoBase() {
  return {
    id: "evento-1",
    title: "Festa de Ana e João",
    accountId: "conta-1",
    hostMaskedEmail: "an••••@exemplo.test",
    vendorId: null,
    vendorName: null,
    startsAt: new Date("2026-06-01T20:00:00Z"),
    expectedGuests: 150,
    totalFotos: 42,
    h1: 0.55,
    status: "active" as const,
    totalSessoes: 80,
    degraus: [{ etapa: "captura" as const, sessoes: 80, retencao: null }],
    consentsByVersion: [{ versao: "v1", aceites: 80, primeiroEm: new Date(), ultimoEm: new Date() }],
  };
}

describe("EventDetailPage", () => {
  it("evento inexistente chama notFound", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce(null);
    await expect(EventDetailPage({ params: Promise.resolve({ id: "x" }) })).rejects.toThrow("notFound");
  });

  it("renderiza os três painéis com dado real", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce(eventoBase());

    const element = await EventDetailPage({ params: Promise.resolve({ id: "evento-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("Identidade");
    expect(texto).toContain("Funil");
    expect(texto).toContain("Consentimento");
  });

  it("H1 null renderiza '—' no subtítulo, nunca '0%'", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce({ ...eventoBase(), h1: null });

    const element = await EventDetailPage({ params: Promise.resolve({ id: "evento-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("H1: —");
    expect(texto).not.toContain("0%");
  });

  it("anfitrião aparece mascarado, nunca o e-mail cru", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce(eventoBase());

    const element = await EventDetailPage({ params: Promise.resolve({ id: "evento-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("an••••@exemplo.test");
    expect(texto).not.toContain("anfitriao-a@exemplo.test");
  });

  it("consentimentos aparecem como contagem agregada, sem nome de convidado", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce(eventoBase());

    const element = await EventDetailPage({ params: Promise.resolve({ id: "evento-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("v1");
    expect(texto).toContain("aceite(s)");
    expect(texto).not.toContain("convidado-");
  });

  it("funil sem sessões mostra estado vazio honesto, não erro", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    getEventMock.mockResolvedValueOnce({ ...eventoBase(), degraus: [] });

    const element = await EventDetailPage({ params: Promise.resolve({ id: "evento-1" }) });
    const texto = JSON.stringify(element);
    expect(texto).toContain("Nenhuma sessão registrada ainda");
  });
});
