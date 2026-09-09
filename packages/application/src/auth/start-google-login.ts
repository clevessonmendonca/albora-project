import type { Pool } from "pg";
import { insertSecurityEvent } from "@albora/db";
import { consumeRateLimit } from "../staff/rate-limit";
import { issueOidcState, sanitizeReturnTo, type IssuedOidcState, type OidcSurface } from "./oidc-state";

export type StartGoogleLoginInput = {
  surface: OidcSurface;
  returnTo?: string;
  eventId?: string;
  guestSessionId?: string;
  ipHash: string;
};

export type StartGoogleLoginResult = IssuedOidcState | { rateLimited: true };

const MAX_REQUESTS_PER_IP_PER_HOUR = 10;

/**
 * `start` comum às três superfícies: rate limit por IP (mesmo padrão de
 * `requestStaffLogin`), sanitização de `returnTo`, e emissão do `state` de
 * uso único (T3). Nunca decide identidade — isso é o callback (T5/T6/T8).
 */
export async function startGoogleLogin(
  pool: Pool,
  secret: string,
  input: StartGoogleLoginInput,
): Promise<StartGoogleLoginResult> {
  const withinLimit = consumeRateLimit(`google_login_start:ip:${input.ipHash}`, MAX_REQUESTS_PER_IP_PER_HOUR, 3600);

  if (!withinLimit) {
    await insertSecurityEvent(pool, {
      kind: "rate_limit.exceeded",
      ipHash: input.ipHash,
      metadata: { surface: "google_login_start" },
    });
    return { rateLimited: true };
  }

  const returnTo = sanitizeReturnTo(input.returnTo, input.surface);
  return issueOidcState(pool, secret, {
    surface: input.surface,
    returnTo,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.guestSessionId ? { guestSessionId: input.guestSessionId } : {}),
  });
}
