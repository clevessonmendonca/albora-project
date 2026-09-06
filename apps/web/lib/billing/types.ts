import type { VendorPlan } from "@albora/db";

/** Porta de cobrança — Asaas atrás desta interface; fora do caminho crítico: checkout e webhook só. */

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

/** Assinatura do fornecedor — Modelo A (spec §4.1); sem split: fornecedor paga plano fixo e cobra o casal por fora. */
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

/** Uma cobrança, para o histórico do anfitrião (admin/billing) — `status` é o valor cru do provedor (Asaas: PENDING, RECEIVED, CONFIRMED, OVERDUE…), a UI decide a cor. */
export type PaymentSummary = {
  id: string;
  status: string;
  amountCents: number;
  billingType: string | null;
  description: string | null;
  createdAt: string;
  dueDate: string | null;
  invoiceUrl: string | null;
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
  listPayments(customerId: string): Promise<PaymentSummary[]>;
};

export const CELEBRATION_PRICE_CENTS = 19900;

/** Preço mensal por tier (Modelo A, §4.1/§4.4) — provisório de MVP; ajustar aqui não exige migration. */
export const VENDOR_PLAN_PRICE_CENTS: Record<VendorPlan, number> = {
  starter: 9900,
  studio: 24900,
  agency: 59900,
};
