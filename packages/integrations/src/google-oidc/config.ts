export type GoogleOidcConfig = { clientId: string; clientSecret: string; redirectUri: string };

export class GoogleOidcConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`GOOGLE_OIDC: variáveis ausentes: ${missing.join(", ")}`);
    this.name = "GoogleOidcConfigError";
  }
}

let memo: GoogleOidcConfig | null = null;

/**
 * Client separado do Drive (ADR 0018, Decisão 1): login não precisa de
 * acesso à API do Google, então nenhum access/refresh token é guardado.
 * Validado só no primeiro uso — ambientes sem SSO configurado não quebram
 * no boot.
 */
export function googleOidcConfig(): GoogleOidcConfig {
  if (memo) return memo;
  const missing: string[] = [];
  const readEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) missing.push(name);
    return value ?? "";
  };
  const clientId = readEnv("GOOGLE_OIDC_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_OIDC_CLIENT_SECRET");
  const redirectUri = readEnv("GOOGLE_OIDC_REDIRECT_URI");
  if (missing.length > 0) throw new GoogleOidcConfigError(missing);
  memo = { clientId, clientSecret, redirectUri };
  return memo;
}

export function resetGoogleOidcConfigForTests(): void {
  memo = null;
}
