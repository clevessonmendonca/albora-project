import type { SessaoResolvida } from "@albora/db";
import { cookies } from "next/headers";
import { GUEST_SESSION_COOKIE, guestSessionFromToken } from "@/lib/session";

export async function guestSession(): Promise<SessaoResolvida | null> {
  return guestSessionFromToken((await cookies()).get(GUEST_SESSION_COOKIE)?.value);
}

export function isSameEventSession(
  session: SessaoResolvida | null,
  eventoId: string,
): session is SessaoResolvida {
  return session !== null && session.eventoId === eventoId;
}
