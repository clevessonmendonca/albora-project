import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { aplicarPlanoPago, claimWebhookEvent, markPaymentPaidByAsaasId, paymentByAsaasId, recordProductEvent } from "@albora/db";
import { getPool } from "@/lib/db";
import { requireHostEvent } from "@/lib/api/host-event";

export const dynamic = "force-dynamic";

type Body = { asaasPaymentId?: unknown };

/**
 * Só em APP_ENV=dev: simula PAYMENT_RECEIVED do stub sem Asaas.
 */
export async function POST(req: Request) {
  if (process.env.APP_ENV !== "dev") {
    return errorResponse(404, "not_found", "Não encontrado");
  }

  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;
  const asaasPaymentId =
    typeof parsed.data.asaasPaymentId === "string" ? parsed.data.asaasPaymentId : "";
  if (!asaasPaymentId.startsWith("pay_stub_")) {
    return errorResponse(422, "validation_error", "Só stub local");
  }

  try {
    const payment = await paymentByAsaasId(getPool(), asaasPaymentId);
    if (!payment || payment.accountId !== auth.host.accountId) {
      return errorResponse(404, "billing.payment_ausente", "Cobrança não encontrada");
    }
    const owned = await requireHostEvent(auth.host.accountId, payment.eventId);
    if (owned instanceof Response) return owned;

    const evtId = `evt_stub_${asaasPaymentId}`;
    const claimed = await claimWebhookEvent(getPool(), evtId, "PAYMENT_RECEIVED", asaasPaymentId);
    if (claimed) {
      await markPaymentPaidByAsaasId(getPool(), asaasPaymentId, "received");
      await aplicarPlanoPago(getPool(), payment.eventId, payment.plan);
      void recordProductEvent(getPool(), "checkout_paid");
    }
    return jsonOk({ ok: true, eventId: payment.eventId, plan: payment.plan });
  } catch (e) {
    return unexpectedError("billing.simulate", e);
  }
}
