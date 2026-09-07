import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleOidcApiError, googleOidcClient } from "./provider";

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("googleOidcClient", () => {
  it("exchangeCode troca code por id_token contra o endpoint do Google", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "id-token-fake", access_token: "access-fake", expires_in: 3600 }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    const tokens = await client.exchangeCode("codigo-de-autorizacao", "https://app.test/auth/google/callback");

    expect(tokens).toEqual({ idToken: "id-token-fake", accessToken: "access-fake", expiresInSeconds: 3600 });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://oauth2.googleapis.com/token");
  });

  it("exchangeCode lança GoogleOidcApiError quando a resposta não é ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({}) }) as unknown as typeof fetch;
    const client = googleOidcClient("client-id", "client-secret");
    await expect(client.exchangeCode("codigo", "https://app.test/callback")).rejects.toThrow(GoogleOidcApiError);
  });

  it("fetchJwks busca o JWKS do Google e cacheia entre chamadas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ kty: "RSA", kid: "k1", n: "abc", e: "AQAB" }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    const primeira = await client.fetchJwks();
    const segunda = await client.fetchJwks();

    expect(primeira).toEqual(segunda);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://www.googleapis.com/oauth2/v3/certs");
  });

  it("nunca loga token, e-mail ou code — mesmo em resposta bem-sucedida", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id_token: "id-token-secreto", access_token: "access-secreto", expires_in: 3600 }),
    }) as unknown as typeof fetch;

    const client = googleOidcClient("client-id", "client-secret");
    await client.exchangeCode("codigo-secreto", "https://app.test/callback");

    const tudoLogado = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(" ");
    expect(tudoLogado).not.toContain("codigo-secreto");
    expect(tudoLogado).not.toContain("id-token-secreto");
    expect(tudoLogado).not.toContain("access-secreto");
  });
});
