import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { getEventInsights } from "@/lib/application/use-cases/admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  try {
    const result = await getEventInsights(
      {
        eventId,
        packId: owned.evento.packId,
        fuso: owned.evento.fuso ?? "UTC",
      },
      getPool(),
    );

    return jsonOk({ missoes: result.missoes, horas: result.horas });
  } catch (e) {
    return unexpectedError("admin.insights", e);
  }
}
