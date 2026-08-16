import {
  ADMIN_SESSION_REQUIRED,
  COUPLE_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import {
  asaasCustomerIdForAccount,
  createBillingPayment,
  upsertBillingCustomer,
} from "@albora/db";
import { getPool } from "@/lib/db";
import {
  CELEBRATION_PRICE_CENTS,
  resolveBilling,
  type CheckoutPlan,
} from "@/lib/billing";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Body = {
  eventId?: unknown;
  plan?: unknown;
  billingType?: unknown;
};

/**
 * Host autenticado inicia checkout Asaas (ou stub em APP_ENV=dev sem chave).
 * Evento permanece `free` até o webhook (ou /api/billing/simulate em stub).
 * Só couple/owner — planner não muda plano.
 */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limit = consume(`billing_checkout:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const eventId = typeof parsed.data.eventId === "string" ? parsed.data.eventId : "";
  if (!eventId) {
    return errorResponse(422, "validation_error", "Evento obrigatório", { campos: ["eventId"] });
  }

  const owned = await requireHostEventRole(auth.host.accountId, eventId, COUPLE_HOST_ROLES);
  if (owned instanceof Response) return owned;

  const billing = resolveBilling();
  if (billing.mode === "unavailable") {
    return errorResponse(503, "billing.indisponivel", "Cobrança indisponível");
  }

  const plan: CheckoutPlan =
    parsed.data.plan === "vendor" ? "vendor" : "celebration";
  const billingType =
    parsed.data.billingType === "PIX" || parsed.data.billingType === "CREDIT_CARD"
      ? parsed.data.billingType
      : "UNDEFINED";

  const amountCents = CELEBRATION_PRICE_CENTS;
  const origin = new URL(req.url).origin;
  const successUrl = `${origin}/admin/e/${eventId}?pago=1`;

  try {
    const provider = billing.provider;
    let customerId = await asaasCustomerIdForAccount(getPool(), auth.host.accountId);
    if (!customerId) {
      customerId = await provider.ensureCustomer(
        auth.host.email,
        auth.host.accountId,
        auth.host.email.split("@")[0],
      );
      await upsertBillingCustomer(getPool(), auth.host.accountId, customerId);
    }

    const checkout = await provider.createCheckout({
      accountId: auth.host.accountId,
      eventId,
      email: auth.host.email,
      plan,
      amountCents,
      billingType,
      successUrl,
      customerId,
    });

    const payment = await createBillingPayment(getPool(), {
      accountId: auth.host.accountId,
      eventId,
      asaasPaymentId: checkout.providerPaymentId,
      plan,
      amountCents,
      billingType,
      invoiceUrl: checkout.invoiceUrl,
    });

    console.log("billing.checkout", { plan, mode: billing.mode });
    return jsonOk({
      paymentId: payment.id,
      asaasPaymentId: payment.asaasPaymentId,
      invoiceUrl: payment.invoiceUrl,
      amountCents,
      plan,
      stub: billing.mode === "stub",
    });
  } catch (e) {
    return unexpectedError("billing.checkout", e);
  }
}
