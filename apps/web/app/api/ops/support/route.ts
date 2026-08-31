import { isPlatformOperator, listOpenSupportTicketsAdmin } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Inbox da equipe Albora — só platform_operators. */
export async function GET(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  try {
    const ok = await isPlatformOperator(getPool(), auth.host.accountId);
    if (!ok) {
      return errorResponse(403, "ops.proibido", "Sem acesso à operação");
    }

    // Leitura cross-conta: pool admin do app. Audit log mínimo.
    console.log("ops.support.list", { accountId: auth.host.accountId });
    const tickets = await listOpenSupportTicketsAdmin(getPool(), auth.host.accountId);
    return jsonOk({
      tickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        eventId: t.eventId,
        createdAt: t.createdAt.toISOString(),
        slaDueAt: t.slaDueAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    return unexpectedError("ops.support", e);
  }
}
