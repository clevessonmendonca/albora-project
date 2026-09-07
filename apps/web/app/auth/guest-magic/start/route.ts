import { NextResponse, type NextRequest } from "next/server";
import { emitGuestMagicLink, sanitizeReturnTo } from "@albora/application";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/infrastructure/email";
import { guestSession, isSameEventSession } from "@/features/guest/data/guest-session";
import { consume } from "@/lib/rate-limit-store";

/**
 * `guestSessionId` NUNCA vem do cliente — resolve server-side a partir do
 * cookie da própria sessão de convidado (mesmo mecanismo do SSO Google em
 * `/auth/google/start`), confirmando que bate com o `eventId` pedido. Sem
 * sessão viva daquele evento, nada é emitido — nem tenta.
 *
 * Rate-limit por ip+sessão antes de emitir: sem isso, uma sessão de
 * convidado viva vira relay de e-mail aberto para qualquer endereço que o
 * cliente informar.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId") ?? undefined;
  const email = searchParams.get("email") ?? undefined;
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"), "guest");

  if (!eventId || !email) return NextResponse.redirect(new URL("/", req.url));

  const sessao = await guestSession();
  if (!isSameEventSession(sessao, eventId)) return NextResponse.redirect(new URL("/", req.url));

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limit = consume(`guest_magic:${ip.split(",")[0]!.trim()}:${sessao.sessaoId}`, 5, 60, Date.now());
  if (!limit.allowed) {
    const throttled = new URL(returnTo, req.url);
    throttled.searchParams.set("guestMagic", "limite");
    return NextResponse.redirect(throttled);
  }

  const { sessionSecret } = config();
  const baseUrl = new URL(req.url).origin;

  await emitGuestMagicLink(
    { pool: getPool(), segredo: sessionSecret, baseUrl, sendEmail: sendHostEmail },
    { eventId, guestSessionId: sessao.sessaoId, email },
  );

  const destino = new URL(returnTo, req.url);
  destino.searchParams.set("guestMagic", "enviado");
  return NextResponse.redirect(destino);
}
