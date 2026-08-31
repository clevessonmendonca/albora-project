import type { SessaoResolvida } from "@albora/db";
import { limitIdentity, guestSessionFromRequest } from "@/lib/session";
import { errorResponse } from "./response";

export { sessionCookieHeader, limitIdentity } from "@/lib/session";

export type GuestSessionContext = {
  session: SessaoResolvida;
  rateLimitKey: string;
};

export async function requireGuestSession(
  req: Request,
  message = "Sessão inválida",
): Promise<GuestSessionContext | Response> {
  const session = await guestSessionFromRequest(req);
  if (!session) {
    return errorResponse(401, "sessao.invalida", message);
  }
  return {
    session,
    rateLimitKey: limitIdentity(req, session),
  };
}
