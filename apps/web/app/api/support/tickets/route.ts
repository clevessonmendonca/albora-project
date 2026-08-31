import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { createSupportTicket, listSupportTicketsForAccount } from "@albora/db";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Body = {
  subject?: unknown;
  body?: unknown;
  eventId?: unknown;
  priority?: unknown;
};

/** Ticket do anfitrião — sem PII de convidado; fora do caminho crítico. */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limit = consume(`support_create:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const subject = typeof parsed.data.subject === "string" ? parsed.data.subject.trim() : "";
  const body = typeof parsed.data.body === "string" ? parsed.data.body.trim() : "";
  if (!subject || !body) {
    return errorResponse(422, "validation_error", "Conte o que aconteceu", {
      campos: ["subject", "body"],
    });
  }

  const eventId = typeof parsed.data.eventId === "string" ? parsed.data.eventId : null;
  const priority =
    parsed.data.priority === "p0" || parsed.data.priority === "p1" || parsed.data.priority === "p2"
      ? parsed.data.priority
      : "p2";

  try {
    const ticket = await createSupportTicket(getPool(), auth.host.accountId, {
      eventId,
      subject,
      body,
      priority,
      source: "admin",
    });
    console.log("support.ticket_criado", { priority: ticket.priority });
    return jsonOk({
      id: ticket.id,
      status: ticket.status,
      priority: ticket.priority,
      slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
    });
  } catch (e) {
    return unexpectedError("support.create", e);
  }
}

export async function GET(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  try {
    const tickets = await listSupportTicketsForAccount(getPool(), auth.host.accountId);
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
    return unexpectedError("support.list", e);
  }
}
