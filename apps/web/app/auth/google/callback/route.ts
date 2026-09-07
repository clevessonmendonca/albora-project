import { NextResponse, type NextRequest } from "next/server";
import {
  claimGuestPhotosByEmail,
  completeGoogleLoginHost,
  completeGoogleLoginStaff,
  consumeOidcState,
  type OidcSurface,
} from "@albora/application";
import { InvalidIdTokenError, validateIdToken } from "@albora/core";
import { googleOidcClient, googleOidcConfig } from "@albora/integrations";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { currentIpHash } from "@/lib/ip-hash";
import { hostCookie } from "@/lib/host-session";
import { issueStaffSession } from "@/lib/console/staff-session";

function fallbackFor(surface: OidcSurface): string {
  if (surface === "host") return "/admin/sign-in?error=google";
  if (surface === "staff") return "/console/login?error=google";
  return "/";
}

/**
 * Nunca loga `code`, `state` nem `id_token` — nem em erro. `email` também
 * não: os três casos de uso por superfície (T5/T6/T8) recebem o e-mail
 * direto, este roteador nunca o passa a `console.*`.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) return NextResponse.redirect(new URL("/", req.url));

  const pool = getPool();
  const { sessionSecret } = config();
  const ipHash = await currentIpHash();

  let payload;
  try {
    payload = await consumeOidcState(pool, sessionSecret, state);
  } catch {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const failUrl = new URL(fallbackFor(payload.surface), req.url);

  try {
    const { clientId, clientSecret, redirectUri } = googleOidcConfig();
    const client = googleOidcClient(clientId, clientSecret);
    const tokens = await client.exchangeCode(code, redirectUri);
    const jwks = await client.fetchJwks();
    const identidade = await validateIdToken({
      idToken: tokens.idToken,
      jwks,
      expectedNonce: payload.nonce,
      expectedAud: clientId,
    });

    if (payload.surface === "host") {
      const resultado = await completeGoogleLoginHost(pool, sessionSecret, { email: identidade.email, ipHash });
      if (!resultado.ok) return NextResponse.redirect(failUrl);
      const response = NextResponse.redirect(new URL(payload.returnTo, req.url));
      response.headers.append("set-cookie", hostCookie(resultado.token, resultado.validityHours));
      return response;
    }

    if (payload.surface === "staff") {
      const resultado = await completeGoogleLoginStaff(pool, { email: identidade.email, ipHash });
      if (!resultado.ok) return NextResponse.redirect(failUrl);
      await issueStaffSession(resultado.staffUserId);
      return NextResponse.redirect(new URL(payload.returnTo, req.url));
    }

    // surface === "guest" — BLINDADO: sem eventId/guestSessionId no state, nunca prossegue.
    if (!payload.eventId || !payload.guestSessionId) return NextResponse.redirect(failUrl);
    await claimGuestPhotosByEmail(pool, {
      eventId: payload.eventId,
      guestSessionId: payload.guestSessionId,
      email: identidade.email,
    });
    return NextResponse.redirect(new URL(payload.returnTo, req.url));
  } catch (erro) {
    if (erro instanceof InvalidIdTokenError) return NextResponse.redirect(failUrl);
    throw erro;
  }
}
