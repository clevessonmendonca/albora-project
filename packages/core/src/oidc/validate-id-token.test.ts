import { describe, expect, it } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { validateIdToken } from "./validate-id-token";
import type { GoogleJwks } from "./validate-id-token";

const EXPECTED_AUD = "client-id-de-teste";
const EXPECTED_NONCE = "nonce-de-teste";

async function jwksEIdToken(overrides: { claims?: Record<string, unknown>; headerKid?: string } = {}) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  const kid = overrides.headerKid ?? "kid-teste";
  const agora = Math.floor(Date.now() / 1000);

  const claims = {
    iss: "https://accounts.google.com",
    aud: EXPECTED_AUD,
    email: "convidado@exemplo.test",
    email_verified: true,
    nonce: EXPECTED_NONCE,
    ...overrides.claims,
  };

  const idToken = await new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid })
    .setIssuedAt(agora)
    .setExpirationTime(agora + 3600)
    .sign(privateKey);

  const jwks: GoogleJwks = { keys: [{ kty: "RSA", kid: "kid-teste", n: jwk.n!, e: jwk.e! }] };
  return { idToken, jwks };
}

describe("validateIdToken", () => {
  it("aceita um id_token válido e devolve o e-mail", async () => {
    const { idToken, jwks } = await jwksEIdToken();
    const resultado = await validateIdToken({
      idToken,
      jwks,
      expectedNonce: EXPECTED_NONCE,
      expectedAud: EXPECTED_AUD,
    });
    expect(resultado).toEqual({ email: "convidado@exemplo.test" });
  });

  it("rejeita assinatura ruim (kid não bate com nenhuma chave do JWKS)", async () => {
    const { idToken, jwks } = await jwksEIdToken({ headerKid: "kid-desconhecido" });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "signature" });
  });

  it("rejeita aud errado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { aud: "outro-client-id" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "audience" });
  });

  it("rejeita iss fora do esperado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { iss: "https://evil.example" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "issuer" });
  });

  it("rejeita token expirado", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    const passado = Math.floor(Date.now() / 1000) - 7200;
    const idToken = await new SignJWT({
      iss: "https://accounts.google.com",
      aud: EXPECTED_AUD,
      email: "convidado@exemplo.test",
      email_verified: true,
      nonce: EXPECTED_NONCE,
    })
      .setProtectedHeader({ alg: "RS256", kid: "kid-teste" })
      .setIssuedAt(passado)
      .setExpirationTime(passado + 60)
      .sign(privateKey);
    const jwks: GoogleJwks = { keys: [{ kty: "RSA", kid: "kid-teste", n: jwk.n!, e: jwk.e! }] };

    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "expired" });
  });

  it("rejeita nonce errado", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { nonce: "nonce-diferente" } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "nonce" });
  });

  it("rejeita email_verified ausente ou false — inegociável (ADR 0018)", async () => {
    const { idToken, jwks } = await jwksEIdToken({ claims: { email_verified: false } });
    await expect(
      validateIdToken({ idToken, jwks, expectedNonce: EXPECTED_NONCE, expectedAud: EXPECTED_AUD }),
    ).rejects.toMatchObject({ reason: "email_not_verified" });

    const semCampo = await jwksEIdToken({ claims: { email_verified: undefined } });
    await expect(
      validateIdToken({
        idToken: semCampo.idToken,
        jwks: semCampo.jwks,
        expectedNonce: EXPECTED_NONCE,
        expectedAud: EXPECTED_AUD,
      }),
    ).rejects.toMatchObject({ reason: "email_not_verified" });
  });

  it("nunca aceita alg none", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none", kid: "kid-teste" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: "https://accounts.google.com",
        aud: EXPECTED_AUD,
        email: "atacante@exemplo.test",
        email_verified: true,
        nonce: EXPECTED_NONCE,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
    const idTokenForjado = `${header}.${payload}.`;

    await expect(
      validateIdToken({
        idToken: idTokenForjado,
        jwks: { keys: [] },
        expectedNonce: EXPECTED_NONCE,
        expectedAud: EXPECTED_AUD,
      }),
    ).rejects.toMatchObject({ reason: "signature" });
  });
});
