import { NextResponse, type NextRequest } from "next/server";
import { isRefToken } from "@albora/core";
import { COOKIE_REF } from "@/lib/analytics/ref-cookie";
import { HEADER_CAMINHO_ADMIN } from "@/lib/admin-sign-in-redirect";

const TRINTA_MINUTOS = 30 * 60;

/**
 * O único trabalho deste middleware: um convidado que chega à landing por
 * `/?ref=<token>` deixa o ref num cookie httpOnly, que o handler de criação
 * de evento lê para atribuir a origem. Rótulo opaco — nunca event_id nem PII.
 * No painel, repassa o caminho pedido num header de request para que a
 * página de servidor devolva o anfitrião ao mesmo lugar depois do login.
 */
export function middleware(req: NextRequest): NextResponse {
  let res = NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const headers = new Headers(req.headers);
    headers.set(HEADER_CAMINHO_ADMIN, req.nextUrl.pathname);
    res = NextResponse.next({ request: { headers } });
  }
  const ref = req.nextUrl.searchParams.get("ref");
  if (isRefToken(ref)) {
    res.cookies.set(COOKIE_REF, ref, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: TRINTA_MINUTOS,
    });
  }
  return res;
}

export const config = { matcher: ["/", "/15-anos", "/admin/:path*"] };
