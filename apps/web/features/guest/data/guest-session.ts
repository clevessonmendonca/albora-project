import type { SessaoResolvida } from "@albora/db";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";

export async function guestSession(): Promise<SessaoResolvida | null> {
  return sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
}

export function isSameEventSession(
  session: SessaoResolvida | null,
  eventoId: string,
): session is SessaoResolvida {
  return session !== null && session.eventoId === eventoId;
}
