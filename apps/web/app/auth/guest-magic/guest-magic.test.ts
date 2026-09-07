import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { reset as resetRateLimit } from "@/lib/rate-limit-store";

/** Cobre as duas portas do magic link do convidado (Task 10): `start` só
 * emite dentro de uma sessão de convidado viva — `guestSessionId`/`eventId`
 * são SEMPRE resolvidos server-side pelo cookie da própria sessão, nunca de
 * parâmetro do cliente (mesma regra do SSO Google, ADR 0018) — e `callback`
 * lê o token do link SOMENTE em `?m=` (nunca `?token=`, guard de sessão) e
 * despacha para `verifyGuestMagicLink` (Task 8), sem nunca emitir sessão de
 * anfitrião. */

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_EVENT_ID = "ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const { emitGuestMagicLink, verifyGuestMagicLink } = vi.hoisted(() => ({
  emitGuestMagicLink: vi.fn(),
  verifyGuestMagicLink: vi.fn(),
}));
vi.mock("@albora/application", () => ({
  emitGuestMagicLink,
  verifyGuestMagicLink,
  sanitizeReturnTo: (returnTo: string | undefined | null) => {
    if (!returnTo) return "/";
    if (!returnTo.startsWith("/")) return "/";
    if (returnTo.startsWith("//")) return "/";
    if (returnTo.includes(":") || returnTo.includes("\\")) return "/";
    return returnTo;
  },
}));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: "segredo-de-teste-com-pelo-menos-32-caracteres" }),
}));

const { sendHostEmail } = vi.hoisted(() => ({ sendHostEmail: vi.fn() }));
vi.mock("@/lib/infrastructure/email", () => ({ sendHostEmail }));

const { guestSession, isSameEventSession } = vi.hoisted(() => ({
  guestSession: vi.fn(),
  isSameEventSession: vi.fn(
    (session: { eventoId: string } | null, eventoId: string) => session !== null && session.eventoId === eventoId,
  ),
}));
vi.mock("@/features/guest/data/guest-session", () => ({ guestSession, isSameEventSession }));

const { GET: startGet } = await import("./start/route");
const { GET: callbackGet } = await import("./callback/route");

function req(path: string, qs: string): NextRequest {
  return new NextRequest(`https://albora.test${path}${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetRateLimit();
  isSameEventSession.mockImplementation(
    (session: { eventoId: string } | null, eventoId: string) => session !== null && session.eventoId === eventoId,
  );
});

describe("GET /auth/guest-magic/start", () => {
  it("sem sessão de convidado viva nunca emite — redireciona pra / antes de chamar emitGuestMagicLink", async () => {
    guestSession.mockResolvedValue(null);

    const res = await startGet(req("/auth/guest-magic/start", `?eventId=${EVENT_ID}&email=convidado@example.com`));

    expect(emitGuestMagicLink).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("sessão de OUTRO evento nunca emite — eventId sozinho não basta", async () => {
    guestSession.mockResolvedValue({ eventoId: OTHER_EVENT_ID, sessaoId: "sessao-de-outro-evento" });

    const res = await startGet(req("/auth/guest-magic/start", `?eventId=${EVENT_ID}&email=convidado@example.com`));

    expect(emitGuestMagicLink).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("com sessão viva, chama emitGuestMagicLink com eventId/guestSessionId resolvidos do cookie, nunca do cliente", async () => {
    guestSession.mockResolvedValue({ eventoId: EVENT_ID, sessaoId: "sessao-legitima-do-cookie" });
    emitGuestMagicLink.mockResolvedValue({ enviado: true });

    await startGet(
      req(
        "/auth/guest-magic/start",
        `?eventId=${EVENT_ID}&email=convidado@example.com&guestSessionId=id-forjado-pelo-cliente`,
      ),
    );

    expect(emitGuestMagicLink).toHaveBeenCalledWith(
      expect.objectContaining({ segredo: expect.any(String), sendEmail: sendHostEmail }),
      { eventId: EVENT_ID, guestSessionId: "sessao-legitima-do-cookie", email: "convidado@example.com" },
    );
  });

  it("returnTo externo (//evil, https://…) cai no default — nunca redireciona pra fora", async () => {
    guestSession.mockResolvedValue({ eventoId: EVENT_ID, sessaoId: "sessao-1" });
    emitGuestMagicLink.mockResolvedValue({ enviado: true });

    const res = await startGet(
      req("/auth/guest-magic/start", `?eventId=${EVENT_ID}&email=convidado@example.com&returnTo=//evil.example.com`),
    );

    const location = new URL(res.headers.get("location")!);
    expect(location.host).toBe("albora.test");
    expect(location.pathname).toBe("/");
  });

  it("sem eventId ou sem email nunca chama emitGuestMagicLink", async () => {
    const res = await startGet(req("/auth/guest-magic/start", ""));

    expect(guestSession).not.toHaveBeenCalled();
    expect(emitGuestMagicLink).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("passar do limite (ip+sessão) nunca chama emitGuestMagicLink — vira relay aberto senão", async () => {
    guestSession.mockResolvedValue({ eventoId: EVENT_ID, sessaoId: "sessao-repetida" });
    emitGuestMagicLink.mockResolvedValue({ enviado: true });

    for (let i = 0; i < 5; i++) {
      await startGet(req("/auth/guest-magic/start", `?eventId=${EVENT_ID}&email=convidado@example.com`));
    }
    expect(emitGuestMagicLink).toHaveBeenCalledTimes(5);

    emitGuestMagicLink.mockClear();
    const res = await startGet(req("/auth/guest-magic/start", `?eventId=${EVENT_ID}&email=convidado@example.com`));

    expect(emitGuestMagicLink).not.toHaveBeenCalled();
    const location = new URL(res.headers.get("location")!);
    expect(location.searchParams.get("guestMagic")).toBe("limite");
  });
});

describe("GET /auth/guest-magic/callback", () => {
  it("lê o token do parâmetro m (nunca de outro nome) e chama verifyGuestMagicLink", async () => {
    verifyGuestMagicLink.mockResolvedValue({ eventId: EVENT_ID });

    await callbackGet(req("/auth/guest-magic/callback", "?m=token-valido-123"));

    expect(verifyGuestMagicLink).toHaveBeenCalledWith(expect.anything(), expect.any(String), "token-valido-123");
  });

  it("token válido redireciona à tela do convidado com sinal de sucesso", async () => {
    verifyGuestMagicLink.mockResolvedValue({ eventId: EVENT_ID });

    const res = await callbackGet(req("/auth/guest-magic/callback", "?m=token-valido-123"));
    const location = new URL(res.headers.get("location")!);

    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("guestMagic")).toBe("ok");
  });

  it("token inválido/expirado (verifyGuestMagicLink retorna null) redireciona com erro neutro, sem lançar", async () => {
    verifyGuestMagicLink.mockResolvedValue(null);

    const res = await callbackGet(req("/auth/guest-magic/callback", "?m=token-expirado"));
    const location = new URL(res.headers.get("location")!);

    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("guestMagic")).toBe("erro");
  });

  it("sem ?m= nunca chama verifyGuestMagicLink", async () => {
    const res = await callbackGet(req("/auth/guest-magic/callback", ""));

    expect(verifyGuestMagicLink).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeTruthy();
  });

  it("returnTo externo no callback também cai no default", async () => {
    verifyGuestMagicLink.mockResolvedValue({ eventId: EVENT_ID });

    const res = await callbackGet(req("/auth/guest-magic/callback", "?m=token-valido&returnTo=https://evil.example.com"));
    const location = new URL(res.headers.get("location")!);

    expect(location.host).toBe("albora.test");
    expect(location.pathname).toBe("/");
  });

  it("nunca loga o token", async () => {
    const chamadas: unknown[][] = [];
    const espiar = (..._args: unknown[]) => chamadas.push(_args);
    vi.spyOn(console, "log").mockImplementation(espiar);
    vi.spyOn(console, "warn").mockImplementation(espiar);
    vi.spyOn(console, "error").mockImplementation(espiar);
    vi.spyOn(console, "debug").mockImplementation(espiar);

    verifyGuestMagicLink.mockResolvedValue(null);
    await callbackGet(req("/auth/guest-magic/callback", "?m=token-secreto-nao-pode-vazar"));

    const serializado = JSON.stringify(chamadas);
    expect(serializado).not.toContain("token-secreto-nao-pode-vazar");
  });
});
