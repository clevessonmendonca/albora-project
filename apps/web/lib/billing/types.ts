import type { VendorPlan } from "@albora/db";

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

/**
 * Assinatura do fornecedor — Modelo A (tipo Gathmo, spec §4.1). Sem split de
 * gateway: o fornecedor paga um plano fixo mensal à plataforma; ele cobra o
 * casal por fora, no canal dele.
 */
export type CreateVendorSubscriptionInput = {
  vendorId: string;
  accountId: string;
  email: string;
  plan: VendorPlan;
  amountCents: number;
  billingType: "PIX" | "CREDIT_CARD" | "UNDEFINED";
  customerId: string;
};

export type CreateVendorSubscriptionResult = {
  providerSubscriptionId: string;
  invoiceUrl: string | null;
  status: string;
};

export type WebhookVendorSubscriptionEvent = {
  eventId: string;
  eventName: string;
  subscriptionId: string;
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
  createSubscription(
    input: CreateVendorSubscriptionInput,
  ): Promise<CreateVendorSubscriptionResult>;
  parseVendorWebhook(
    headers: Headers,
    body: unknown,
    expectedAccessToken: string | null,
  ): WebhookVendorSubscriptionEvent | { error: string } | null;
};

export const CELEBRATION_PRICE_CENTS = 19900;

/**
 * Preço mensal por tier do fornecedor (Modelo A, assinatura fixa — spec
 * §4.1/§4.4). Valores provisórios de MVP, mesma disciplina de
 * `CELEBRATION_PRICE_CENTS`: nenhuma decisão de precificação definitiva foi
 * tomada em `docs/product/`; ajustar aqui não exige migration nem mudança de
 * schema.
 */
export const VENDOR_PLAN_PRICE_CENTS: Record<VendorPlan, number> = {
  starter: 9900,
  studio: 24900,
  agency: 59900,
};
