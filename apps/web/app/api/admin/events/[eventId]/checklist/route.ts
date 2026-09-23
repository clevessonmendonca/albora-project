import {
  desmarcarItemChecklist,
  lerChecklist,
  marcarItemChecklist,
  withEvent,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  ANY_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { ehChaveManualDoChecklist } from "@/features/admin/lib/pre-event-checklist";

export const dynamic = "force-dynamic";

type Corpo = {
  item?: unknown;
  feito?: unknown;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_checklist:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const acesso = await requireHostEventRole(auth.host.accountId, eventId, ANY_HOST_ROLES);
  if (acesso instanceof Response) return acesso;

  try {
    const marcados = await withEvent(getPool(), eventId, (c) => lerChecklist(c, eventId));
    return jsonOk({ marcados });
  } catch (e) {
    return unexpectedError("admin.checklist", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_checklist_escrita:${auth.host.accountId}`, 120, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const { item, feito } = parsed.data;

  if (typeof item !== "string" || !ehChaveManualDoChecklist(item)) {
    return errorResponse(422, "validation_error", "Item de checklist desconhecido", {
      campos: ["item"],
    });
  }

  if (typeof feito !== "boolean") {
    return errorResponse(422, "validation_error", "Informe se o item está feito", {
      campos: ["feito"],
    });
  }

  const acesso = await requireHostEventRole(auth.host.accountId, eventId, ANY_HOST_ROLES);
  if (acesso instanceof Response) return acesso;

  try {
    await withEvent(getPool(), eventId, (c) =>
      feito
        ? marcarItemChecklist(c, eventId, item, auth.host.accountId)
        : desmarcarItemChecklist(c, eventId, item),
    );

    const marcados = await withEvent(getPool(), eventId, (c) => lerChecklist(c, eventId));
    return jsonOk({ marcados });
  } catch (e) {
    return unexpectedError("admin.checklist", e);
  }
}
