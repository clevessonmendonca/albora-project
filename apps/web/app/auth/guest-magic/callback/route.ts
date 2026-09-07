import { NextResponse, type NextRequest } from "next/server";
import { sanitizeReturnTo, verifyGuestMagicLink } from "@albora/application";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";

/**
 * Token lido só de `?m=` — nunca `?token=`/`?session=`/`?sid=` (guard de
 * sessão: vaza por referrer, histórico e log de proxy). Nunca loga o token.
 * Só verifica e reivindica as fotos por e-mail (Task 8); nunca emite sessão
 * de anfitrião — o convidado continua sem login.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("m");
  const returnTo = sanitizeReturnTo(searchParams.get("returnTo"), "guest");

  const destino = new URL(returnTo, req.url);

  if (!token) {
    destino.searchParams.set("guestMagic", "erro");
    return NextResponse.redirect(destino);
  }

  const { sessionSecret } = config();
  const resultado = await verifyGuestMagicLink(getPool(), sessionSecret, token);

  destino.searchParams.set("guestMagic", resultado ? "ok" : "erro");
  return NextResponse.redirect(destino);
}
