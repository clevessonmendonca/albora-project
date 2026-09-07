import { errors as joseErrors, importJWK, jwtVerify } from "jose";

export type GoogleJwk = { kty: string; use?: string; kid: string; n: string; e: string; alg?: string };
export type GoogleJwks = { keys: GoogleJwk[] };

export type MotivoIdTokenInvalido =
  | "signature"
  | "issuer"
  | "audience"
  | "expired"
  | "nonce"
  | "email_not_verified";

export class InvalidIdTokenError extends Error {
  constructor(readonly reason: MotivoIdTokenInvalido) {
    super(`id_token inválido: ${reason}`);
    this.name = "InvalidIdTokenError";
  }
}

export type ValidateIdTokenInput = {
  idToken: string;
  jwks: GoogleJwks;
  expectedNonce: string;
  expectedAud: string;
  now?: Date;
};

export type ValidatedIdentity = { email: string };

const ISSUERS_VALIDOS = ["https://accounts.google.com", "accounts.google.com"];

function decodeHeaderKid(idToken: string): string {
  const [headerB64] = idToken.split(".");
  if (!headerB64) throw new InvalidIdTokenError("signature");
  let header: { kid?: string; alg?: string };
  try {
    header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8")) as {
      kid?: string;
      alg?: string;
    };
  } catch {
    throw new InvalidIdTokenError("signature");
  }
  // `alg: none` é o ataque clássico de JWT — nunca aceito, mesmo antes de olhar o JWKS.
  if (!header.kid || header.alg !== "RS256") throw new InvalidIdTokenError("signature");
  return header.kid;
}

/**
 * Pura e testável sem rede (JWKS injetado pelo chamador — T4 busca via
 * `GoogleOidcClient.fetchJwks()`). Ordem de validação: assinatura contra o
 * JWKS -> iss/aud/exp (via `jose`) -> nonce -> email_verified. Qualquer
 * falha lança `InvalidIdTokenError` com o motivo exato — nunca uma
 * mensagem genérica que esconderia qual invariante quebrou (útil só pra
 * log interno, nunca pra resposta ao usuário).
 */
export async function validateIdToken(input: ValidateIdTokenInput): Promise<ValidatedIdentity> {
  const kid = decodeHeaderKid(input.idToken);
  const jwk = input.jwks.keys.find((k) => k.kid === kid);
  if (!jwk) throw new InvalidIdTokenError("signature");

  const chavePublica = await importJWK({ kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256" }, "RS256");

  let payload;
  try {
    ({ payload } = await jwtVerify(input.idToken, chavePublica, {
      issuer: ISSUERS_VALIDOS,
      audience: input.expectedAud,
      ...(input.now ? { currentDate: input.now } : {}),
    }));
  } catch (erro) {
    if (erro instanceof joseErrors.JWTExpired) throw new InvalidIdTokenError("expired");
    if (erro instanceof joseErrors.JWTClaimValidationFailed) {
      if (erro.claim === "iss") throw new InvalidIdTokenError("issuer");
      if (erro.claim === "aud") throw new InvalidIdTokenError("audience");
    }
    throw new InvalidIdTokenError("signature");
  }

  if (payload.nonce !== input.expectedNonce) throw new InvalidIdTokenError("nonce");
  if (payload.email_verified !== true) throw new InvalidIdTokenError("email_not_verified");

  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email) throw new InvalidIdTokenError("email_not_verified");

  return { email };
}
