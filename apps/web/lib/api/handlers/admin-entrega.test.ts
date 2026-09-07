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

const { definirAberturaDeEntrega, withEvent } = vi.hoisted(() => ({
  definirAberturaDeEntrega: vi.fn(),
  withEvent: vi.fn((_pool: unknown, _eventId: string, fn: (c: unknown) => unknown) => fn({})),
}));
vi.mock("@albora/db", () => ({ definirAberturaDeEntrega, withEvent }));

const { runDeliveryForEvent } = vi.hoisted(() => ({
  runDeliveryForEvent: vi.fn(),
}));
vi.mock("@albora/application", () => ({ runDeliveryForEvent }));

const { sendHostEmail } = vi.hoisted(() => ({ sendHostEmail: vi.fn() }));
vi.mock("@/lib/infrastructure/email", () => ({ sendHostEmail }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

vi.mock("@/lib/config", () => ({ config: () => ({ sessionSecret: "segredo-de-teste" }) }));

const { consume } = vi.hoisted(() => ({ consume: vi.fn() }));
vi.mock("@/lib/rate-limit-store", () => ({ consume }));

const { patchEntrega, postDisparo } = await import("./admin-entrega");

function params(eventId: string = EVENT_ID) {
  return { params: Promise.resolve({ eventId }) };
}

function patchReq(body: unknown) {
  return new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/entrega`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function postReq() {
  return new Request(`https://exemplo.test/api/admin/events/${EVENT_ID}/entrega/disparar`, {
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireConfig.mockReturnValue(null);
  requireHostSession.mockResolvedValue({
    host: { accountId: ACCOUNT_ID, email: "casal@exemplo.test" },
  });
  requireHostEvent.mockResolvedValue({ evento: { eventoId: EVENT_ID } });
  consume.mockReturnValue({ allowed: true, remaining: 9, resetInSeconds: 60 });
  withEvent.mockImplementation((_pool: unknown, _eventId: string, fn: (c: unknown) => unknown) =>
    fn({}),
  );
});

describe("PATCH /api/admin/events/[eventId]/entrega — gate", () => {
  it("sem sessão: 401, sem tocar o setter", async () => {
    requireHostSession.mockResolvedValue(
      Response.json({ code: "admin.sem_sessao" }, { status: 401 }),
    );

    const res = await patchEntrega(patchReq({ deliveryOpensAt: "2026-10-10T20:00:00.000Z" }), params());

    expect(res.status).toBe(401);
    expect(definirAberturaDeEntrega).not.toHaveBeenCalled();
  });

  it("evento de outra conta: 404, sem tocar o setter", async () => {
    requireHostEvent.mockResolvedValue(
      Response.json({ code: "evento.nao_encontrado" }, { status: 404 }),
    );

    const res = await patchEntrega(patchReq({ deliveryOpensAt: "2026-10-10T20:00:00.000Z" }), params());

    expect(res.status).toBe(404);
    expect(definirAberturaDeEntrega).not.toHaveBeenCalled();
  });

  it("abre o gate com a data recebida: persiste via o setter e devolve 200", async () => {
    const iso = "2026-10-10T20:00:00.000Z";

    const res = await patchEntrega(patchReq({ deliveryOpensAt: iso }), params());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { deliveryOpensAt: string | null };
    expect(body.deliveryOpensAt).toBe(iso);
    expect(definirAberturaDeEntrega).toHaveBeenCalledWith({}, EVENT_ID, new Date(iso));
  });

  it("fecha o gate com null", async () => {
    const res = await patchEntrega(patchReq({ deliveryOpensAt: null }), params());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { deliveryOpensAt: string | null };
    expect(body.deliveryOpensAt).toBeNull();
    expect(definirAberturaDeEntrega).toHaveBeenCalledWith({}, EVENT_ID, null);
  });

  it("data inválida: 422, sem tocar o setter", async () => {
    const res = await patchEntrega(patchReq({ deliveryOpensAt: "não é uma data" }), params());

    expect(res.status).toBe(422);
    expect(definirAberturaDeEntrega).not.toHaveBeenCalled();
  });

  it("rate limit: 429", async () => {
    consume.mockReturnValue({ allowed: false, remaining: 0, resetInSeconds: 30 });

    const res = await patchEntrega(patchReq({ deliveryOpensAt: null }), params());

    expect(res.status).toBe(429);
    expect(definirAberturaDeEntrega).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/events/[eventId]/entrega/disparar — trigger", () => {
  it("sem sessão: 401, sem chamar runDeliveryForEvent", async () => {
    requireHostSession.mockResolvedValue(
      Response.json({ code: "admin.sem_sessao" }, { status: 401 }),
    );

    const res = await postDisparo(postReq(), params());

    expect(res.status).toBe(401);
    expect(runDeliveryForEvent).not.toHaveBeenCalled();
  });

  it("evento de outra conta: 404, sem chamar runDeliveryForEvent", async () => {
    requireHostEvent.mockResolvedValue(
      Response.json({ code: "evento.nao_encontrado" }, { status: 404 }),
    );

    const res = await postDisparo(postReq(), params());

    expect(res.status).toBe(404);
    expect(runDeliveryForEvent).not.toHaveBeenCalled();
  });

  it("gate aberto: dispara e devolve a contagem de runDeliveryForEvent", async () => {
    runDeliveryForEvent.mockResolvedValue({ enviados: 3, pendentes: 1 });

    const res = await postDisparo(postReq(), params());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { enviados: number; pendentes: number };
    expect(body).toEqual({ enviados: 3, pendentes: 1 });
    expect(runDeliveryForEvent).toHaveBeenCalledWith(
      expect.objectContaining({ segredo: "segredo-de-teste", sendEmail: sendHostEmail }),
      EVENT_ID,
    );
  });

  it("gate fechado ou futuro: runDeliveryForEvent já devolve 0 enviados — o handler só repassa", async () => {
    runDeliveryForEvent.mockResolvedValue({ enviados: 0, pendentes: 0 });

    const res = await postDisparo(postReq(), params());

    expect(res.status).toBe(200);
    const body = (await res.json()) as { enviados: number; pendentes: number };
    expect(body).toEqual({ enviados: 0, pendentes: 0 });
  });

  it("rate limit: 429", async () => {
    consume.mockReturnValue({ allowed: false, remaining: 0, resetInSeconds: 30 });

    const res = await postDisparo(postReq(), params());

    expect(res.status).toBe(429);
    expect(runDeliveryForEvent).not.toHaveBeenCalled();
  });
});
