import {
  isBillingStubMode,
  readAsaasConfig,
  type AsaasEnvConfig,
} from "./config";
import { parseVendorWebhook, parseWebhook } from "./parse-webhook";
import type {
  BillingProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreateVendorSubscriptionInput,
  CreateVendorSubscriptionResult,
  PaymentSummary,
} from "./types";

async function asaasFetch(
  path: string,
  init: RequestInit & { apiKey: string; baseUrl: string },
): Promise<Response> {
  return fetch(`${init.baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      access_token: init.apiKey,
      ...(init.headers ?? {}),
    },
  });
}

function asaasProviderFromConfig(c: AsaasEnvConfig): BillingProvider {
  return {
    async ensureCustomer(email, externalRef, name) {
      const found = await asaasFetch(
        `/customers?email=${encodeURIComponent(email)}&limit=1`,
        { method: "GET", apiKey: c.apiKey, baseUrl: c.baseUrl },
      );
      if (found.ok) {
        const data = (await found.json()) as { data?: { id: string }[] };
        const id = data.data?.[0]?.id;
        if (id) return id;
      }

      const created = await asaasFetch("/customers", {
        method: "POST",
        apiKey: c.apiKey,
        baseUrl: c.baseUrl,
        body: JSON.stringify({
          name: name ?? email.split("@")[0] ?? "Anfitrião",
          email,
          externalReference: externalRef,
        }),
      });
      if (!created.ok) {
        const text = await created.text();
        throw new Error(`asaas.customer: ${created.status} ${text}`);
      }
      const body = (await created.json()) as { id: string };
      return body.id;
    },

    async createCheckout(input: CreateCheckoutInput & { customerId: string }): Promise<CreateCheckoutResult> {
      const value = input.amountCents / 100;
      const res = await asaasFetch("/payments", {
        method: "POST",
        apiKey: c.apiKey,
        baseUrl: c.baseUrl,
        body: JSON.stringify({
          customer: input.customerId,
          billingType: input.billingType,
          value,
          dueDate: new Date().toISOString().slice(0, 10),
          description: `Albora Completo — evento ${input.eventId.slice(0, 8)}`,
          externalReference: `${input.eventId}:${input.plan}`,
          callback: { successUrl: input.successUrl },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`asaas.payment: ${res.status} ${text}`);
      }
      const body = (await res.json()) as {
        id: string;
        status: string;
        invoiceUrl?: string;
        bankSlipUrl?: string;
      };
      return {
        providerPaymentId: body.id,
        invoiceUrl: body.invoiceUrl ?? body.bankSlipUrl ?? null,
        status: body.status,
      };
    },

    async createSubscription(
      input: CreateVendorSubscriptionInput,
    ): Promise<CreateVendorSubscriptionResult> {
      const value = input.amountCents / 100;
      const res = await asaasFetch("/subscriptions", {
        method: "POST",
        apiKey: c.apiKey,
        baseUrl: c.baseUrl,
        body: JSON.stringify({
          customer: input.customerId,
          billingType: input.billingType,
          value,
          nextDueDate: new Date().toISOString().slice(0, 10),
          cycle: "MONTHLY",
          description: `Albora Fornecedor — plano ${input.plan}`,
          externalReference: `${input.vendorId}:${input.plan}`,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`asaas.subscription: ${res.status} ${text}`);
      }
      const body = (await res.json()) as {
        id: string;
        status: string;
        invoiceUrl?: string;
      };
      return {
        providerSubscriptionId: body.id,
        invoiceUrl: body.invoiceUrl ?? null,
        status: body.status,
      };
    },

    async listPayments(customerId: string): Promise<PaymentSummary[]> {
      const res = await asaasFetch(
        `/payments?customer=${encodeURIComponent(customerId)}&limit=100`,
        { method: "GET", apiKey: c.apiKey, baseUrl: c.baseUrl },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`asaas.payments.list: ${res.status} ${text}`);
      }
      const body = (await res.json()) as {
        data?: Array<{
          id: string;
          status: string;
          value: number;
          billingType?: string;
          description?: string;
          dateCreated?: string;
          dueDate?: string;
          invoiceUrl?: string;
          bankSlipUrl?: string;
        }>;
      };
      return (body.data ?? []).map((p) => ({
        id: p.id,
        status: p.status,
        amountCents: Math.round((p.value ?? 0) * 100),
        billingType: p.billingType ?? null,
        description: p.description ?? null,
        createdAt: p.dateCreated ?? new Date().toISOString(),
        dueDate: p.dueDate ?? null,
        invoiceUrl: p.invoiceUrl ?? p.bankSlipUrl ?? null,
      }));
    },

    parseWebhook,
    parseVendorWebhook,
  };
}

/** Provedor Asaas. Null sem ASAAS_API_KEY. */
export function asaasProvider(): BillingProvider | null {
  const c = readAsaasConfig();
  if (!c) return null;
  return asaasProviderFromConfig(c);
}

/** Stub local: cobrança fake; invoiceUrl aponta para simular no admin. */
export function stubBillingProvider(): BillingProvider {
  return {
    async ensureCustomer(_email, externalRef) {
      return `cus_stub_${externalRef.slice(0, 8)}`;
    },
    async createCheckout(input) {
      const id = `pay_stub_${input.eventId.replace(/-/g, "").slice(0, 16)}`;
      return {
        providerPaymentId: id,
        invoiceUrl: `/admin/e/${input.eventId}?checkout=stub&pay=${id}`,
        status: "PENDING",
      };
    },
    async createSubscription(input) {
      const id = `sub_stub_${input.vendorId.replace(/-/g, "").slice(0, 16)}`;
      return {
        providerSubscriptionId: id,
        invoiceUrl: null,
        status: "PENDING",
      };
    },
    async listPayments() {
      return [];
    },
    parseWebhook,
    parseVendorWebhook,
  };
}

export type ResolvedBilling =
  | { mode: "asaas"; provider: BillingProvider; sandbox: boolean }
  | { mode: "stub"; provider: BillingProvider }
  | { mode: "unavailable"; reason: string };

export function resolveBilling(): ResolvedBilling {
  const asaas = asaasProvider();
  if (asaas) {
    const c = readAsaasConfig()!;
    return { mode: "asaas", provider: asaas, sandbox: c.sandbox };
  }
  if (isBillingStubMode()) {
    return { mode: "stub", provider: stubBillingProvider() };
  }
  return {
    mode: "unavailable",
    reason: "ASAAS_API_KEY ausente (stub só com APP_ENV=dev)",
  };
}

export function getBillingProvider(): BillingProvider {
  const resolved = resolveBilling();
  if (resolved.mode === "unavailable") {
    throw new Error(resolved.reason);
  }
  return resolved.provider;
}
