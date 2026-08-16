import type {
  BillingProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  WebhookPaymentEvent,
} from "./types";

type AsaasConfig = {
  apiKey: string;
  baseUrl: string;
};

function cfg(): AsaasConfig | null {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  if (!apiKey) return null;
  const sandbox = process.env.ASAAS_SANDBOX !== "0";
  return {
    apiKey,
    baseUrl: sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3",
  };
}

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

/**
 * Provedor Asaas. Sem `ASAAS_API_KEY` devolve null — o checkout usa stub local.
 */
export function asaasProvider(): BillingProvider | null {
  const c = cfg();
  if (!c) return null;

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

    parseWebhook(headers, body, expectedAccessToken) {
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
    },
  };
}

/** Stub local: gera cobrança fake e invoiceUrl apontando para simular no admin. */
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
    parseWebhook(headers, body, expectedAccessToken) {
      if (expectedAccessToken) {
        const got = headers.get("asaas-access-token");
        if (got !== expectedAccessToken) return { error: "token" };
      }
      if (typeof body !== "object" || body === null) return null;
      const row = body as {
        id?: unknown;
        event?: unknown;
        payment?: { id?: unknown };
      };
      if (typeof row.id !== "string" || typeof row.event !== "string") return null;
      if (typeof row.payment?.id !== "string") return null;
      const status =
        row.event === "PAYMENT_RECEIVED"
          ? "RECEIVED"
          : row.event === "PAYMENT_CONFIRMED"
            ? "CONFIRMED"
            : "OTHER";
      return {
        eventId: row.id,
        eventName: row.event,
        paymentId: row.payment.id,
        status,
      };
    },
  };
}

export function getBillingProvider(): BillingProvider {
  return asaasProvider() ?? stubBillingProvider();
}
