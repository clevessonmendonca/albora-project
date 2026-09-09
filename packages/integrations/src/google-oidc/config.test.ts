import { afterEach, describe, expect, it } from "vitest";
import { GoogleOidcConfigError, googleOidcConfig, resetGoogleOidcConfigForTests } from "./config";

const originais = {
  id: process.env.GOOGLE_OIDC_CLIENT_ID,
  secret: process.env.GOOGLE_OIDC_CLIENT_SECRET,
  redirect: process.env.GOOGLE_OIDC_REDIRECT_URI,
};

afterEach(() => {
  process.env.GOOGLE_OIDC_CLIENT_ID = originais.id;
  process.env.GOOGLE_OIDC_CLIENT_SECRET = originais.secret;
  process.env.GOOGLE_OIDC_REDIRECT_URI = originais.redirect;
  resetGoogleOidcConfigForTests();
});

describe("googleOidcConfig", () => {
  it("lê as três variáveis quando presentes", () => {
    process.env.GOOGLE_OIDC_CLIENT_ID = "id-teste";
    process.env.GOOGLE_OIDC_CLIENT_SECRET = "segredo-teste";
    process.env.GOOGLE_OIDC_REDIRECT_URI = "https://app.test/auth/google/callback";
    resetGoogleOidcConfigForTests();

    expect(googleOidcConfig()).toEqual({
      clientId: "id-teste",
      clientSecret: "segredo-teste",
      redirectUri: "https://app.test/auth/google/callback",
    });
  });

  it("lança GoogleOidcConfigError listando as variáveis ausentes", () => {
    delete process.env.GOOGLE_OIDC_CLIENT_ID;
    delete process.env.GOOGLE_OIDC_CLIENT_SECRET;
    process.env.GOOGLE_OIDC_REDIRECT_URI = "https://app.test/auth/google/callback";
    resetGoogleOidcConfigForTests();

    try {
      googleOidcConfig();
      throw new Error("deveria ter lançado");
    } catch (erro) {
      expect(erro).toBeInstanceOf(GoogleOidcConfigError);
      expect((erro as GoogleOidcConfigError).missing).toEqual([
        "GOOGLE_OIDC_CLIENT_ID",
        "GOOGLE_OIDC_CLIENT_SECRET",
      ]);
    }
  });
});
