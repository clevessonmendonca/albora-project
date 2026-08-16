import {
  isBillingStubMode,
  readAsaasConfig,
  type AsaasEnvConfig,
} from "./config";
import { parseWebhook } from "./parse-webhook";
import type {
  BillingProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
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

    parseWebhook,
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
    parseWebhook,
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
