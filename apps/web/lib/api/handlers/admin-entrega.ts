import { definirAberturaDeEntrega, withEvent } from "@albora/db";
import { runDeliveryForEvent } from "@albora/application";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/infrastructure/email";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type PatchBody = { deliveryOpensAt?: unknown };

async function requireOwnedEvent(req: Request, eventId: string) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  return { host: auth.host, evento: owned.evento };
}

/** Abre (`deliveryOpensAt` = ISO) ou fecha (`null`) o gate de entrega das fotos. Quem decide o "quando" é o casal, não o cron. */
export async function patchEntrega(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireOwnedEvent(req, eventId);
  if (ctx instanceof Response) return ctx;

  const limite = consume(`admin_entrega:${ctx.host.accountId}`, 20, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<PatchBody>(req);
  if (parsed instanceof Response) return parsed;

  const bruto = parsed.data.deliveryOpensAt;
  let quando: Date | null;
  if (bruto === null) {
    quando = null;
  } else if (typeof bruto === "string") {
    const data = new Date(bruto);
    if (Number.isNaN(data.getTime())) {
      return errorResponse(422, "validation_error", "Data inválida", {
        campos: ["deliveryOpensAt"],
      });
    }
    quando = data;
  } else {
    return errorResponse(422, "validation_error", "Data inválida", {
      campos: ["deliveryOpensAt"],
    });
  }

  try {
    await withEvent(getPool(), eventId, (c) => definirAberturaDeEntrega(c, eventId, quando));
    console.log("admin.entrega.gate", {
      accountId: ctx.host.accountId,
      eventId,
      aberto: quando !== null,
    });
    return jsonOk({ deliveryOpensAt: quando ? quando.toISOString() : null });
  } catch (e) {
    return unexpectedError("admin.entrega.gate", e);
  }
}

/** Dispara manualmente a rodada de entrega. O cron automático é só outro consumidor de `runDeliveryForEvent` — este é o caminho do admin, fora do crítico de sábado. */
export async function postDisparo(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const ctx = await requireOwnedEvent(req, eventId);
  if (ctx instanceof Response) return ctx;

  const limite = consume(`admin_entrega_disparo:${ctx.host.accountId}`, 5, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const origin = new URL(req.url).origin;
    const { enviados, pendentes } = await runDeliveryForEvent(
      {
        pool: getPool(),
        segredo: config().sessionSecret,
        baseUrl: origin,
        sendEmail: sendHostEmail,
      },
      eventId,
    );
    console.log("admin.entrega.disparo", {
      accountId: ctx.host.accountId,
      eventId,
      enviados,
      pendentes,
    });
    return jsonOk({ enviados, pendentes });
  } catch (e) {
    return unexpectedError("admin.entrega.disparo", e);
  }
}
