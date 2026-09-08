export type GoogleOidcTokens = {
  idToken: string;
  accessToken: string;
  expiresInSeconds: number;
};

export type GoogleJwk = { kty: string; use?: string; kid: string; n: string; e: string; alg?: string };
export type GoogleJwks = { keys: GoogleJwk[] };

/** Client OIDC de LOGIN — nunca loga token, e-mail ou code (mesma disciplina de DriveClient). */
export interface GoogleOidcClient {
  /** Troca `code` por tokens contra `https://oauth2.googleapis.com/token`. */
  exchangeCode(code: string, redirectUri: string): Promise<GoogleOidcTokens>;
  /** Busca (e cacheia) o JWKS do Google, para validação do `id_token` fora deste módulo. */
  fetchJwks(): Promise<GoogleJwks>;
}
