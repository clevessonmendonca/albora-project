import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type * as CoreModule from "@albora/core";

/** Cobre o roteador do callback (T4): troca `code` por tokens, valida o
 * `id_token` (T2) e despacha por `surface` para o caso de uso certo
 * (T5/T6/T8, mockados aqui — o corpo real chega em tasks futuras). O que
 * este arquivo protege é o ROTEAMENTO e as invariantes de segurança: state
 * inválido nunca troca o code, e nada sensível (`code`/`state`/`id_token`/
 * e-mail) aparece em log. */

const CODE_SECRETO = "codigo-de-autorizacao-nao-pode-vazar";
const STATE_BRUTO = "state-recebido-do-google";
const ID_TOKEN_SEGREDO = "id-token-jwt-nao-pode-vazar";
const EMAIL_CONVIDADO = "convidado-privado@example.com";

const { consumeOidcState } = vi.hoisted(() => ({ consumeOidcState: vi.fn() }));
const { completeGoogleLoginHost } = vi.hoisted(() => ({ completeGoogleLoginHost: vi.fn() }));
const { completeGoogleLoginStaff } = vi.hoisted(() => ({ completeGoogleLoginStaff: vi.fn() }));
const { claimGuestPhotosByEmail } = vi.hoisted(() => ({ claimGuestPhotosByEmail: vi.fn() }));
vi.mock("@albora/application", () => ({
  consumeOidcState,
  completeGoogleLoginHost,
  completeGoogleLoginStaff,
  claimGuestPhotosByEmail,
}));

// `InvalidIdTokenError` precisa ser a classe REAL — o roteador faz `instanceof` nela.
const { validateIdToken } = vi.hoisted(() => ({ validateIdToken: vi.fn() }));
vi.mock("@albora/core", async (importOriginal) => {
  const actual = await importOriginal<typeof CoreModule>();
  return { ...actual, validateIdToken };
});
const { InvalidIdTokenError } = await import("@albora/core");

const { exchangeCode, fetchJwks, googleOidcClient, googleOidcConfig } = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  fetchJwks: vi.fn(),
  googleOidcClient: vi.fn(),
  googleOidcConfig: vi.fn(),
}));
vi.mock("@albora/integrations", () => ({ googleOidcClient, googleOidcConfig }));

vi.mock("@/lib/db", () => ({ getPool: () => ({}) }));
vi.mock("@/lib/config", () => ({
  config: () => ({ sessionSecret: "segredo-de-teste-com-pelo-menos-32-caracteres" }),
}));

const { currentIpHash } = vi.hoisted(() => ({ currentIpHash: vi.fn() }));
vi.mock("@/lib/ip-hash", () => ({ currentIpHash }));

const { hostCookie } = vi.hoisted(() => ({ hostCookie: vi.fn() }));
vi.mock("@/lib/host-session", () => ({ hostCookie }));

const { issueStaffSession } = vi.hoisted(() => ({ issueStaffSession: vi.fn() }));
vi.mock("@/lib/console/staff-session", () => ({ issueStaffSession }));

const { GET } = await import("./route");

function req(qs: string): NextRequest {
  return new NextRequest(`https://albora.test/auth/google/callback${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentIpHash.mockResolvedValue("hash-ip-1");
  googleOidcConfig.mockReturnValue({
    clientId: "client-id-teste",
    clientSecret: "client-secret-teste",
    redirectUri: "https://albora.test/auth/google/callback",
  });
  googleOidcClient.mockReturnValue({ exchangeCode, fetchJwks });
  exchangeCode.mockResolvedValue({ idToken: ID_TOKEN_SEGREDO, accessToken: "access-token", expiresInSeconds: 3600 });
  fetchJwks.mockResolvedValue({ keys: [] });
  validateIdToken.mockResolvedValue({ email: EMAIL_CONVIDADO });
  hostCookie.mockReturnValue("albora_host=token123; Path=/; HttpOnly");
  issueStaffSession.mockResolvedValue("staff-session-hash");
});

describe("GET /auth/google/callback", () => {
  it("state inválido/reusado (consumeOidcState lança) redireciona sem trocar o code", async () => {
    consumeOidcState.mockRejectedValue(new Error("state consumido ou assinatura inválida"));

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(exchangeCode).not.toHaveBeenCalled();
    expect(fetchJwks).not.toHaveBeenCalled();
  });

  it("sem code ou sem state nunca chama consumeOidcState", async () => {
    const res = await GET(req(""));

    expect(consumeOidcState).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBeTruthy();
  });

  it("surface=host feliz roteia para completeGoogleLoginHost e redireciona ao returnTo com cookie de host", async () => {
    consumeOidcState.mockResolvedValue({
      surface: "host",
      nonce: "nonce-host",
      returnTo: "/admin/eventos",
    });
    completeGoogleLoginHost.mockResolvedValue({ ok: true, token: "token-host-123", validityHours: 12 });

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(completeGoogleLoginHost).toHaveBeenCalledWith(
      expect.anything(),
      "segredo-de-teste-com-pelo-menos-32-caracteres",
      { email: EMAIL_CONVIDADO, ipHash: "hash-ip-1" },
    );
    expect(completeGoogleLoginStaff).not.toHaveBeenCalled();
    expect(claimGuestPhotosByEmail).not.toHaveBeenCalled();
    expect(hostCookie).toHaveBeenCalledWith("token-host-123", 12);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/eventos");
    expect(res.headers.get("set-cookie")).toBe("albora_host=token123; Path=/; HttpOnly");
  });

  it("surface=host recusado (ok: false) redireciona ao login de host com erro, sem cookie", async () => {
    consumeOidcState.mockResolvedValue({ surface: "host", nonce: "n", returnTo: "/admin/eventos" });
    completeGoogleLoginHost.mockResolvedValue({ ok: false });

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/sign-in");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("surface=staff feliz roteia para completeGoogleLoginStaff e emite sessão de staff", async () => {
    consumeOidcState.mockResolvedValue({ surface: "staff", nonce: "n", returnTo: "/console" });
    completeGoogleLoginStaff.mockResolvedValue({ ok: true, staffUserId: "staff-user-1" });

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(completeGoogleLoginStaff).toHaveBeenCalledWith(expect.anything(), {
      email: EMAIL_CONVIDADO,
      ipHash: "hash-ip-1",
    });
    expect(issueStaffSession).toHaveBeenCalledWith("staff-user-1");
    expect(completeGoogleLoginHost).not.toHaveBeenCalled();
    expect(claimGuestPhotosByEmail).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/console");
  });

  it("surface=staff recusado (ok: false) redireciona ao login do console com erro", async () => {
    consumeOidcState.mockResolvedValue({ surface: "staff", nonce: "n", returnTo: "/console" });
    completeGoogleLoginStaff.mockResolvedValue({ ok: false });

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(issueStaffSession).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/console/login");
  });

  it("surface=guest feliz roteia para claimGuestPhotosByEmail com o eventId/guestSessionId do state", async () => {
    consumeOidcState.mockResolvedValue({
      surface: "guest",
      nonce: "n",
      returnTo: "/",
      eventId: "evento-1",
      guestSessionId: "sessao-1",
    });

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(claimGuestPhotosByEmail).toHaveBeenCalledWith(expect.anything(), {
      eventId: "evento-1",
      guestSessionId: "sessao-1",
      email: EMAIL_CONVIDADO,
    });
    expect(completeGoogleLoginHost).not.toHaveBeenCalled();
    expect(completeGoogleLoginStaff).not.toHaveBeenCalled();
    expect(new URL(res.headers.get("location")!).pathname).toBe("/");
  });

  it("surface=guest sem eventId/guestSessionId no state nunca chama claimGuestPhotosByEmail — blindado", async () => {
    consumeOidcState.mockResolvedValue({ surface: "guest", nonce: "n", returnTo: "/" });

    await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(claimGuestPhotosByEmail).not.toHaveBeenCalled();
  });

  it("id_token inválido (InvalidIdTokenError) redireciona ao login da superfície certa, sem lançar", async () => {
    consumeOidcState.mockResolvedValue({ surface: "staff", nonce: "n", returnTo: "/console" });
    validateIdToken.mockRejectedValue(new InvalidIdTokenError("nonce"));

    const res = await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    expect(new URL(res.headers.get("location")!).pathname).toBe("/console/login");
    expect(completeGoogleLoginStaff).not.toHaveBeenCalled();
  });

  it("erro inesperado (não InvalidIdTokenError) propaga, não é engolido silenciosamente", async () => {
    consumeOidcState.mockResolvedValue({ surface: "host", nonce: "n", returnTo: "/admin" });
    exchangeCode.mockRejectedValue(new Error("google fora do ar"));

    await expect(GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`))).rejects.toThrow("google fora do ar");
  });

  it("nunca loga code, state, id_token ou e-mail — nem no caminho feliz nem no de erro", async () => {
    const chamadas: unknown[][] = [];
    const espiar = (..._args: unknown[]) => chamadas.push(_args);
    vi.spyOn(console, "log").mockImplementation(espiar);
    vi.spyOn(console, "warn").mockImplementation(espiar);
    vi.spyOn(console, "error").mockImplementation(espiar);
    vi.spyOn(console, "debug").mockImplementation(espiar);

    consumeOidcState.mockResolvedValue({ surface: "host", nonce: "n", returnTo: "/admin" });
    completeGoogleLoginHost.mockResolvedValue({ ok: true, token: "token-x", validityHours: 12 });
    await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    consumeOidcState.mockRejectedValue(new Error("state ruim"));
    await GET(req(`?code=${CODE_SECRETO}&state=${STATE_BRUTO}`));

    const serializado = JSON.stringify(chamadas);
    expect(serializado).not.toContain(CODE_SECRETO);
    expect(serializado).not.toContain(STATE_BRUTO);
    expect(serializado).not.toContain(ID_TOKEN_SEGREDO);
    expect(serializado).not.toContain(EMAIL_CONVIDADO);
  });
});
