import { funnelEventFromClient } from "@/features/guest/lib/funnel-client-events";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
} from "@/lib/api";

export const dynamic = "force-dynamic";

type Corpo = { name?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const name = funnelEventFromClient(parsed.data.name);
  if (name === null) {
    return errorResponse(422, "funil.evento_invalido", "Evento desconhecido", { campos: ["name"] });
  }

  await recordFunnelEvent(auth.session.eventoId, auth.session.sessaoId, name);
  return jsonOk({ ok: true });
}
