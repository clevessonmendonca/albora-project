/**
 * Porta de cobrança — Asaas atrás desta interface para trocar depois.
 * Fora do caminho crítico de sábado: checkout e webhook só.
 */

export type CheckoutPlan = "celebration" | "vendor";

export type CreateCheckoutInput = {
  accountId: string;
  eventId: string;
  email: string;
  plan: CheckoutPlan;
  amountCents: number;
  billingType: "PIX" | "CREDIT_CARD" | "UNDEFINED";
  successUrl: string;
  customerName?: string;
};

export type CreateCheckoutResult = {
  providerPaymentId: string;
  invoiceUrl: string | null;
  status: string;
};

export type WebhookPaymentEvent = {
  eventId: string;
  eventName: string;
  paymentId: string;
  status: "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "DELETED" | "OTHER";
};

export type BillingProvider = {
  ensureCustomer(email: string, externalRef: string, name?: string): Promise<string>;
  createCheckout(input: CreateCheckoutInput & { customerId: string }): Promise<CreateCheckoutResult>;
  parseWebhook(
    headers: Headers,
    body: unknown,
    expectedAccessToken: string | null,
  ): WebhookPaymentEvent | { error: string } | null;
};

export const CELEBRATION_PRICE_CENTS = 19900;
