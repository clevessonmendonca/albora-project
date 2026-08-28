import type { WebhookPaymentEvent, WebhookVendorSubscriptionEvent } from "./types";

export type ParseWebhookResult =
  | WebhookPaymentEvent
  | { error: "token" }
  | null;

export type ParseVendorWebhookResult =
  | WebhookVendorSubscriptionEvent
  | { error: "token" }
  | null;

/** Parse + auth do webhook Asaas — independente de API key; stub só emula o payload. */
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

/** Parse + auth do webhook de assinatura do fornecedor (Modelo A, §4.4) — token verificado ANTES do corpo; sem `payment.subscription` → null, nunca correlação por id. */
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
