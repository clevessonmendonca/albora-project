import {
  aplicarPlanoPago,
  claimWebhookEvent,
  markPaymentPaidByAsaasId,
  recordProductEvent,
} from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import {
  isBillingStubMode,
  parseWebhook,
  readAsaasWebhookToken,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Webhook Asaas — única escrita de `events.plan` pago (via `aplicarPlanoPago`); idempotente por `asaas_event_id`. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "billing.webhook_invalido", "JSON inválido");
  }

  const token = readAsaasWebhookToken();
  if (!token && !isBillingStubMode()) {
    return errorResponse(503, "billing.webhook_config", "Webhook não configurado");
  }

  const parsed = parseWebhook(req.headers, body, token);
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
        void recordProductEvent(getPool(), "checkout_paid");
        console.log("billing.plan_aplicado", { plan: paid.plan });
      }
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return unexpectedError("billing.webhook", e);
  }
}
