import { NextResponse, type NextRequest } from "next/server";
import { startGoogleLogin, type OidcSurface } from "@albora/application";
import { googleOidcConfig } from "@albora/integrations";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { currentIpHash } from "@/lib/ip-hash";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

function surfaceValida(valor: string | null): valor is OidcSurface {
  return valor === "host" || valor === "staff" || valor === "guest";
}

/**
 * `guest` NUNCA aceita `guestSessionId` do cliente — resolve server-side a
 * partir do cookie da própria sessão de convidado (o mesmo mecanismo de
 * qualquer outra rota do convidado), confirmando que bate com `eventId`
 * pedido. O cliente só informa o `eventId` (público, não é credencial).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const surfaceParam = searchParams.get("surface");
  const returnTo = searchParams.get("returnTo") ?? undefined;
  const eventId = searchParams.get("eventId") ?? undefined;

  if (!surfaceValida(surfaceParam)) return NextResponse.redirect(new URL("/", req.url));

  let guestSessionId: string | undefined;
  if (surfaceParam === "guest") {
    if (!eventId) return NextResponse.redirect(new URL("/", req.url));
    const sessao = await guestSession();
    if (!isSameEventSession(sessao, eventId)) return NextResponse.redirect(new URL("/", req.url));
    guestSessionId = sessao.sessaoId;
  }

  const ipHash = await currentIpHash();
  const { sessionSecret } = config();
  const { clientId, redirectUri } = googleOidcConfig();

  const resultado = await startGoogleLogin(getPool(), sessionSecret, {
    surface: surfaceParam,
    ipHash,
    ...(returnTo ? { returnTo } : {}),
    ...(eventId ? { eventId } : {}),
    ...(guestSessionId ? { guestSessionId } : {}),
  });

  if ("rateLimited" in resultado) return NextResponse.redirect(new URL("/", req.url));

  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", resultado.state);
  url.searchParams.set("nonce", resultado.nonce);

  return NextResponse.redirect(url);
}
