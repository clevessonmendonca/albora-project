import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/** Cobre a porta de entrada do SSO Google (T4): a rota monta a URL de
 * autorização a partir do `state`/`nonce` emitidos por `startGoogleLogin`
 * (T4/application) e — regra dura do plano — nunca aceita `guestSessionId`
 * do cliente: resolve sempre server-side, pelo cookie da própria sessão de
 * convidado. */

const EVENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const OTHER_EVENT_ID = "ffffffff-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

const { startGoogleLogin } = vi.hoisted(() => ({ startGoogleLogin: vi.fn() }));
vi.mock("@albora/application", () => ({ startGoogleLogin }));

const { googleOidcConfig } = vi.hoisted(() => ({ googleOidcConfig: vi.fn() }));
vi.mock("@albora/integrations", () => ({ googleOidcConfig }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));

vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: "segredo-de-teste-com-pelo-menos-32-caracteres" }),
}));

const { currentIpHash } = vi.hoisted(() => ({ currentIpHash: vi.fn() }));
vi.mock("@/lib/ip-hash", () => ({ currentIpHash }));

const { guestSession, isSameEventSession } = vi.hoisted(() => ({
  guestSession: vi.fn(),
  isSameEventSession: vi.fn(
    (session: { eventoId: string } | null, eventoId: string) => session !== null && session.eventoId === eventoId,
  ),
}));
vi.mock("@/features/guest/data/guest-session", () => ({ guestSession, isSameEventSession }));

const { GET } = await import("./route");

function req(qs: string): NextRequest {
  return new NextRequest(`https://albora.test/auth/google/start${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentIpHash.mockResolvedValue("hash-ip-1");
  googleOidcConfig.mockReturnValue({
    clientId: "client-id-teste",
    clientSecret: "client-secret-teste",
    redirectUri: "https://albora.test/auth/google/callback",
  });
  isSameEventSession.mockImplementation(
    (session: { eventoId: string } | null, eventoId: string) => session !== null && session.eventoId === eventoId,
  );
});

describe("GET /auth/google/start", () => {
  it("surface=host redireciona ao Google com state e nonce emitidos por startGoogleLogin", async () => {
    startGoogleLogin.mockResolvedValue({ state: "state-abc", nonce: "nonce-xyz" });

    const res = await GET(req("?surface=host&returnTo=/admin/eventos"));
    const location = new URL(res.headers.get("location")!);

    expect(location.origin + location.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location.searchParams.get("state")).toBe("state-abc");
    expect(location.searchParams.get("nonce")).toBe("nonce-xyz");
    expect(location.searchParams.get("client_id")).toBe("client-id-teste");
    expect(location.searchParams.get("scope")).toBe("openid email");
    expect(startGoogleLogin).toHaveBeenCalledWith(
      expect.anything(),
      "segredo-de-teste-com-pelo-menos-32-caracteres",
      expect.objectContaining({ surface: "host", returnTo: "/admin/eventos", ipHash: "hash-ip-1" }),
    );
  });

  it("surface=guest sem sessão de convidado nunca chega a emitir state — nega antes de startGoogleLogin", async () => {
    guestSession.mockResolvedValue(null);

    const res = await GET(req(`?surface=guest&eventId=${EVENT_ID}`));

    expect(startGoogleLogin).not.toHaveBeenCalled();
    expect(res.headers.get("location")).not.toContain("accounts.google.com");
  });

  it("surface=guest com sessão de OUTRO evento nega — guestSessionId nunca é aceito por bater eventId sozinho", async () => {
    guestSession.mockResolvedValue({ eventoId: OTHER_EVENT_ID, sessaoId: "sessao-de-outro-evento" });

    const res = await GET(req(`?surface=guest&eventId=${EVENT_ID}`));

    expect(startGoogleLogin).not.toHaveBeenCalled();
    expect(res.headers.get("location")).not.toContain("accounts.google.com");
  });

  it("surface=guest com sessão válida resolve guestSessionId do cookie, nunca de um parâmetro do cliente", async () => {
    guestSession.mockResolvedValue({ eventoId: EVENT_ID, sessaoId: "sessao-legitima-do-cookie" });
    startGoogleLogin.mockResolvedValue({ state: "state-guest", nonce: "nonce-guest" });

    // O cliente tenta mandar um guestSessionId próprio — a rota nem lê esse parâmetro.
    await GET(req(`?surface=guest&eventId=${EVENT_ID}&guestSessionId=id-forjado-pelo-cliente`));

    expect(startGoogleLogin).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(String),
      expect.objectContaining({ surface: "guest", guestSessionId: "sessao-legitima-do-cookie" }),
    );
  });

  it("surface inválida nega sem chamar startGoogleLogin", async () => {
    const res = await GET(req("?surface=admin"));

    expect(startGoogleLogin).not.toHaveBeenCalled();
    expect(res.headers.get("location")).not.toContain("accounts.google.com");
  });

  it("rate limitado nunca redireciona ao Google", async () => {
    startGoogleLogin.mockResolvedValue({ rateLimited: true });

    const res = await GET(req("?surface=staff"));

    expect(res.headers.get("location")).not.toContain("accounts.google.com");
  });
});
