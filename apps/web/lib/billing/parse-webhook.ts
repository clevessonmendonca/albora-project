import type { WebhookPaymentEvent } from "./types";

export type ParseWebhookResult =
  | WebhookPaymentEvent
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
