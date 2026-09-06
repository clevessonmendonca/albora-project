import { NextResponse, type NextRequest } from "next/server";
import { isRefToken } from "@albora/core";
import { COOKIE_REF } from "@/lib/analytics/ref-cookie";

const TRINTA_MINUTOS = 30 * 60;

/**
 * O único trabalho deste middleware: um convidado que chega à landing por
 * `/?ref=<token>` deixa o ref num cookie httpOnly, que o handler de criação
 * de evento lê para atribuir a origem. Rótulo opaco — nunca event_id nem PII.
 */
export function middleware(req: NextRequest): NextResponse {
  const res = NextResponse.next();
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

export const config = { matcher: ["/", "/15-anos"] };
