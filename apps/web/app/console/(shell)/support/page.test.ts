import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const { resolveActorMock, listTicketQueueMock, getTicketDetailMock, listActiveStaffMock, redirectMock } = vi.hoisted(() => ({
  resolveActorMock: vi.fn(),
  listTicketQueueMock: vi.fn(),
  getTicketDetailMock: vi.fn(),
  listActiveStaffMock: vi.fn(),
  redirectMock: vi.fn(() => {
    throw new Error("redirect");
  }),
}));

vi.mock("@/lib/console/actor", () => ({ resolveActor: resolveActorMock }));
vi.mock("@/lib/db", () => ({ getPool: vi.fn(), getAggregatorPool: vi.fn() }));
vi.mock("@albora/application", () => ({
  listTicketQueue: listTicketQueueMock,
  getTicketDetail: getTicketDetailMock,
  listActiveStaff: listActiveStaffMock,
}));
// `SupportQueue`/`TicketDetail` ("use client") usam `useSearchParams`/server
// actions — sem contexto de app router de verdade neste teste
// (`renderToStaticMarkup` puro), mesmo precedente de `accounts/page.test.ts`.
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/features/console/actions", () => ({
  respondTicketAction: vi.fn(),
  assignTicketAction: vi.fn(),
  updateTicketStatusAction: vi.fn(),
  updateTicketPriorityAction: vi.fn(),
}));

import SupportPage from "./page";

function actor(roles: string[] = ["support"]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function montarTicket(overrides: { id?: string } = {}) {
  return {
    id: overrides.id ?? "t1",
    accountId: "c1",
    eventId: null,
    subject: "dúvida",
    status: "open" as const,
    priority: "p2" as const,
    slaDueAt: null,
    createdAt: new Date(),
    assigneeStaffId: null,
  };
}

describe("SupportPage", () => {
  afterEach(() => vi.clearAllMocks());

  it("fila vazia mostra o vazio de verdade ('nenhum ticket aberto'), não a tela de detalhe nem erro", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listTicketQueueMock.mockResolvedValueOnce({ rows: [] });
    listActiveStaffMock.mockResolvedValueOnce([]);

    const element = await SupportPage({ searchParams: Promise.resolve({}) });
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("Nenhum ticket aberto");
    expect(getTicketDetailMock).not.toHaveBeenCalled();
  });

  it("com fila, mostra a conta mascarada do ticket ativo (o primeiro da fila, por padrão)", async () => {
    resolveActorMock.mockResolvedValueOnce(actor());
    listTicketQueueMock.mockResolvedValueOnce({ rows: [montarTicket()] });
    listActiveStaffMock.mockResolvedValueOnce([]);
    getTicketDetailMock.mockResolvedValueOnce({
      ticket: montarTicket(),
      messages: [],
      customerContext: { maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] },
    });

    const element = await SupportPage({ searchParams: Promise.resolve({}) });
    const serializado = renderToStaticMarkup(element);

    expect(serializado).toContain("t••••@x.com");
    expect(getTicketDetailMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ ticketId: "t1" }));
  });

  it("financeiro (tickets.read, sem write/assign) não vê o campo de responder e não busca a lista de staff", async () => {
    resolveActorMock.mockResolvedValueOnce(actor(["finance"]));
    listTicketQueueMock.mockResolvedValueOnce({ rows: [montarTicket()] });
    getTicketDetailMock.mockResolvedValueOnce({
      ticket: montarTicket(),
      messages: [],
      customerContext: { maskedEmail: "t••••@x.com", plan: null, events: [], recentPayments: [] },
    });

    const element = await SupportPage({ searchParams: Promise.resolve({}) });
    const serializado = renderToStaticMarkup(element);

    expect(serializado).not.toContain(">Responder<");
    // finance não tem tickets.assign — a página nem chama listActiveStaff, em vez de chamar e deixar o envelope negar.
    expect(listActiveStaffMock).not.toHaveBeenCalled();
  });

  it("sem ator resolvido, redireciona para /console/login sem chamar listTicketQueue", async () => {
    resolveActorMock.mockResolvedValueOnce(null);

    await expect(SupportPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("redirect");
    expect(listTicketQueueMock).not.toHaveBeenCalled();
  });
});
