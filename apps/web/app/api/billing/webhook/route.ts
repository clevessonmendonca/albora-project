import {
  aplicarPlanoPago,
  claimWebhookEvent,
  markPaymentPaidByAsaasId,
} from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { getBillingProvider } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * Webhook Asaas — única escrita de `events.plan` pago.
 * Idempotente por `asaas_event_id`.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "billing.webhook_invalido", "JSON inválido");
  }

  const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim() || null;
  const parsed = getBillingProvider().parseWebhook(req.headers, body, token);
  if (parsed && "error" in parsed) {
    return errorResponse(401, "billing.webhook_token", "Token inválido");
  }
  if (!parsed) {
    return jsonOk({ ignored: true });
  }

  try {
    const claimed = await claimWebhookEvent(
      getPool(),
      parsed.eventId,
      parsed.eventName,
      parsed.paymentId,
    );
    if (!claimed) {
      return jsonOk({ duplicate: true });
    }

    if (parsed.status === "CONFIRMED" || parsed.status === "RECEIVED") {
      const paid = await markPaymentPaidByAsaasId(
        getPool(),
        parsed.paymentId,
        parsed.status === "RECEIVED" ? "received" : "confirmed",
      );
      if (paid) {
        await aplicarPlanoPago(getPool(), paid.eventId, paid.plan);
        console.log("billing.plan_aplicado", { plan: paid.plan });
      }
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return unexpectedError("billing.webhook", e);
  }
}
