import type { GoogleJwks, GoogleOidcClient, GoogleOidcTokens } from "./types";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs";
const JWKS_CACHE_TTL_MS = 10 * 60 * 1000;

export class GoogleOidcApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(`google oidc: ${code} (status ${status})`);
    this.name = "GoogleOidcApiError";
  }
}

/** Mock no boundary: o objeto inteiro devolvido aqui é o que os testes de chamadores substituem. */
export function googleOidcClient(clientId: string, clientSecret: string): GoogleOidcClient {
  let jwksCache: { jwks: GoogleJwks; fetchedAt: number } | null = null;

  return {
    async exchangeCode(code: string, redirectUri: string): Promise<GoogleOidcTokens> {
      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!res.ok) throw new GoogleOidcApiError("token_exchange_failed", res.status);
      const corpo = (await res.json()) as { id_token?: string; access_token: string; expires_in: number };
      if (!corpo.id_token) throw new GoogleOidcApiError("id_token_ausente", res.status);
      return { idToken: corpo.id_token, accessToken: corpo.access_token, expiresInSeconds: corpo.expires_in };
    },

    async fetchJwks(): Promise<GoogleJwks> {
      const agora = Date.now();
      if (jwksCache && agora - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) return jwksCache.jwks;
      const res = await fetch(JWKS_ENDPOINT);
      if (!res.ok) throw new GoogleOidcApiError("jwks_fetch_failed", res.status);
      const jwks = (await res.json()) as GoogleJwks;
      jwksCache = { jwks, fetchedAt: agora };
      return jwks;
    },
  };
}
