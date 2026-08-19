import type { WebhookPaymentEvent, WebhookVendorSubscriptionEvent } from "./types";

export type ParseWebhookResult =
  | WebhookPaymentEvent
  | { error: "token" }
  | null;

export type ParseVendorWebhookResult =
  | WebhookVendorSubscriptionEvent
  | { error: "token" }
  | null;

/**
 * Parse + auth do webhook Asaas. Independente de ter API key
 * (o webhook é o escritor de plano pago; o stub só emula o payload).
 */
export function parseWebhook(
  headers: Headers,
  body: unknown,
  expectedAccessToken: string | null,
): ParseWebhookResult {
  if (expectedAccessToken) {
    const got = headers.get("asaas-access-token");
    if (got !== expectedAccessToken) {
      return { error: "token" };
    }
  }
  if (typeof body !== "object" || body === null) return null;
  const row = body as {
    id?: unknown;
    event?: unknown;
    payment?: { id?: unknown; status?: unknown };
  };
  if (typeof row.id !== "string" || typeof row.event !== "string") return null;
  const paymentId = row.payment?.id;
  if (typeof paymentId !== "string") return null;

  const name = row.event;
  let status: WebhookPaymentEvent["status"] = "OTHER";
  if (name === "PAYMENT_CONFIRMED") status = "CONFIRMED";
  else if (name === "PAYMENT_RECEIVED") status = "RECEIVED";
  else if (name === "PAYMENT_OVERDUE") status = "OVERDUE";
  else if (name === "PAYMENT_REFUNDED") status = "REFUNDED";
  else if (name === "PAYMENT_DELETED") status = "DELETED";

  return {
    eventId: row.id,
    eventName: name,
    paymentId,
    status,
  };
}

/**
 * Parse + auth do webhook Asaas para pagamentos de **assinatura** do
 * fornecedor (Modelo A, spec §4.4). Token verificado ANTES de qualquer
 * leitura de corpo — um POST forjado nunca chega a `payment.subscription`.
 *
 * Asaas envia o mesmo formato de evento de pagamento (`PAYMENT_CONFIRMED`
 * etc.), mas com `payment.subscription` preenchido quando o pagamento nasceu
 * de uma assinatura recorrente. Payload sem esse campo não é assinatura —
 * devolve `null` (ignorado), nunca tentativa de correlacionar por
 * `asaas_subscription_id`.
 */
export function parseVendorWebhook(
  headers: Headers,
  body: unknown,
  expectedAccessToken: string | null,
): ParseVendorWebhookResult {
  if (expectedAccessToken) {
    const got = headers.get("asaas-access-token");
    if (got !== expectedAccessToken) {
      return { error: "token" };
    }
  }
  if (typeof body !== "object" || body === null) return null;
  const row = body as {
    id?: unknown;
    event?: unknown;
    payment?: { subscription?: unknown; status?: unknown };
  };
  if (typeof row.id !== "string" || typeof row.event !== "string") return null;
  const subscriptionId = row.payment?.subscription;
  if (typeof subscriptionId !== "string") return null;

  const name = row.event;
  let status: WebhookVendorSubscriptionEvent["status"] = "OTHER";
  if (name === "PAYMENT_CONFIRMED") status = "CONFIRMED";
  else if (name === "PAYMENT_RECEIVED") status = "RECEIVED";
  else if (name === "PAYMENT_OVERDUE") status = "OVERDUE";
  else if (name === "PAYMENT_REFUNDED") status = "REFUNDED";
  else if (name === "PAYMENT_DELETED") status = "DELETED";

  return {
    eventId: row.id,
    eventName: name,
    subscriptionId,
    status,
  };
}
