import type { Pool, PoolClient } from "pg";
import { comAgregacao, comEvento } from "./event";
import type { PlanoDoEvento } from "@albora/core";
import type { VendorPlan } from "./vendor-portal";

export type BillingPaymentStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "refunded"
  | "overdue"
  | "deleted";

export type BillingPayment = {
  id: string;
  accountId: string;
  eventId: string;
  asaasPaymentId: string;
  status: BillingPaymentStatus;
  plan: "celebration" | "vendor";
  amountCents: number;
  invoiceUrl: string | null;
};

export async function upsertBillingCustomer(
  pool: Pool,
  accountId: string,
  asaasCustomerId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO billing_customers (account_id, asaas_customer_id)
     VALUES ($1, $2)
     ON CONFLICT (account_id) DO UPDATE SET asaas_customer_id = EXCLUDED.asaas_customer_id`,
    [accountId, asaasCustomerId],
  );
}

export async function asaasCustomerIdForAccount(
  pool: Pool,
  accountId: string,
): Promise<string | null> {
  const { rows } = await pool.query<{ asaas_customer_id: string }>(
    `SELECT asaas_customer_id FROM billing_customers WHERE account_id = $1`,
    [accountId],
  );
  return rows[0]?.asaas_customer_id ?? null;
}

export async function createBillingPayment(
  pool: Pool,
  entrada: {
    accountId: string;
    eventId: string;
    asaasPaymentId: string;
    plan: "celebration" | "vendor";
    amountCents: number;
    billingType?: string | null;
    invoiceUrl?: string | null;
  },
): Promise<BillingPayment> {
  const { rows } = await pool.query<{
    id: string;
    account_id: string;
    event_id: string;
    asaas_payment_id: string;
    status: BillingPaymentStatus;
    plan: "celebration" | "vendor";
    amount_cents: number;
    invoice_url: string | null;
  }>(
    `INSERT INTO billing_payments
       (account_id, event_id, asaas_payment_id, status, plan, amount_cents, billing_type, invoice_url)
     VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7)
     RETURNING id, account_id, event_id, asaas_payment_id, status, plan, amount_cents, invoice_url`,
    [
      entrada.accountId,
      entrada.eventId,
      entrada.asaasPaymentId,
      entrada.plan,
      entrada.amountCents,
      entrada.billingType ?? null,
      entrada.invoiceUrl ?? null,
    ],
  );
  const r = rows[0]!;
  return {
    id: r.id,
    accountId: r.account_id,
    eventId: r.event_id,
    asaasPaymentId: r.asaas_payment_id,
    status: r.status,
    plan: r.plan,
    amountCents: r.amount_cents,
    invoiceUrl: r.invoice_url,
  };
}

/** Marca webhook processado. `false` = já visto (idempotente). */
export async function claimWebhookEvent(
  pool: Pool,
  asaasEventId: string,
  eventName: string,
  paymentId: string | null,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `INSERT INTO billing_webhook_events (asaas_event_id, event_name, payment_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (asaas_event_id) DO NOTHING`,
    [asaasEventId, eventName, paymentId],
  );
  return (rowCount ?? 0) > 0;
}

export async function markPaymentPaidByAsaasId(
  pool: Pool,
  asaasPaymentId: string,
  status: "confirmed" | "received",
): Promise<{ eventId: string; plan: "celebration" | "vendor"; accountId: string } | null> {
  const { rows } = await pool.query<{
    id: string;
    account_id: string;
    event_id: string;
    plan: "celebration" | "vendor";
  }>(
    `UPDATE billing_payments
        SET status = $2, paid_at = COALESCE(paid_at, now()), updated_at = now()
      WHERE asaas_payment_id = $1
      RETURNING id, account_id, event_id, plan`,
    [asaasPaymentId, status],
  );
  const row = rows[0];
  if (!row) return null;
  return { eventId: row.event_id, plan: row.plan, accountId: row.account_id };
}

/**
 * Única escrita de plano pago em produção (via webhook).
 */
export async function aplicarPlanoPago(
  pool: Pool,
  eventId: string,
  plan: Extract<PlanoDoEvento, "celebration" | "vendor">,
): Promise<void> {
  await comEvento(pool, eventId, async (c: PoolClient) => {
    await c.query(`UPDATE events SET plan = $2 WHERE id = $1`, [eventId, plan]);
  });
}

// ─────────────────────────────────────────────────────────────
// Assinatura do fornecedor — Modelo A (tipo Gathmo, ver spec §4.1).
// O fornecedor assina um plano fixo mensal na plataforma; ele cobra o casal
// por fora, no canal dele. Zero split de gateway: reusa billing_customers
// (por accountId) e o mesmo desenho de billing_payments/webhook, só que sem
// event_id — a linha aqui mapeia asaas_subscription_id → vendor_id.
// ─────────────────────────────────────────────────────────────

export type VendorSubscriptionStatus = "pending" | "active" | "overdue" | "canceled";

export type VendorSubscription = {
  id: string;
  vendorId: string;
  accountId: string;
  asaasSubscriptionId: string;
  status: VendorSubscriptionStatus;
  plan: VendorPlan;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Registra a assinatura antes de chamar o Asaas — espelha `createBillingPayment`.
 * O chamador (rota `POST /api/vendors/{id}/subscription`, fora do escopo desta
 * mudança) confere `roleForAccountOnVendor(pool, accountId, vendorId) === "admin"`
 * antes de invocar esta função; ela não repete a checagem porque não tem como
 * fazê-lo sob RLS sem reabrir a mesma consulta duas vezes na mesma transação.
 */
export async function createVendorSubscription(
  pool: Pool,
  entrada: {
    vendorId: string;
    accountId: string;
    asaasSubscriptionId: string;
    plan: VendorPlan;
  },
): Promise<VendorSubscription> {
  const { rows } = await pool.query<{
    id: string;
    vendor_id: string;
    account_id: string;
    asaas_subscription_id: string;
    status: VendorSubscriptionStatus;
    plan: VendorPlan;
    created_at: Date;
    updated_at: Date;
  }>(
    `INSERT INTO vendor_subscriptions
       (vendor_id, account_id, asaas_subscription_id, status, plan)
     VALUES ($1, $2, $3, 'pending', $4)
     RETURNING id, vendor_id, account_id, asaas_subscription_id, status, plan, created_at, updated_at`,
    [entrada.vendorId, entrada.accountId, entrada.asaasSubscriptionId, entrada.plan],
  );
  const r = rows[0]!;
  return {
    id: r.id,
    vendorId: r.vendor_id,
    accountId: r.account_id,
    asaasSubscriptionId: r.asaas_subscription_id,
    status: r.status,
    plan: r.plan,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Marca a assinatura pelo id do Asaas — devolve `null` se o webhook não achar (evento desconhecido/duplicado). */
export async function markVendorSubscriptionByAsaasId(
  pool: Pool,
  asaasSubscriptionId: string,
  status: Exclude<VendorSubscriptionStatus, "pending">,
): Promise<{ vendorId: string; accountId: string; plan: VendorPlan } | null> {
  const { rows } = await pool.query<{ vendor_id: string; account_id: string; plan: VendorPlan }>(
    `UPDATE vendor_subscriptions
        SET status = $2, updated_at = now()
      WHERE asaas_subscription_id = $1
      RETURNING vendor_id, account_id, plan`,
    [asaasSubscriptionId, status],
  );
  const row = rows[0];
  if (!row) return null;
  return { vendorId: row.vendor_id, accountId: row.account_id, plan: row.plan };
}

/**
 * Única escrita de `vendors.status`/`plan` pago, via webhook — espelha
 * `aplicarPlanoPago`.
 *
 * `aplicarPlanoPago` escapa a RLS de `events` porque `comEvento` seta
 * `app.event_id` para exatamente o id da linha, e a política de isolamento
 * por evento casa por `id`. `vendors` não tem esse escape: a única política
 * (`vendor_membro`) exige pertencimento em `vendor_members`, que o webhook —
 * sem sessão de conta — não tem. Por isso esta escrita usa `comAgregacao`
 * (BYPASSRLS, auditado), com `motivo` fechado ao `vendorId` já resolvido por
 * `markVendorSubscriptionByAsaasId`, nunca um `UPDATE` sem filtro.
 */
export async function ativarPlanoDoFornecedor(
  pool: Pool,
  vendorId: string,
  plan: VendorPlan,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<void> {
  await comAgregacao(pool, `billing_webhook:vendor:${vendorId}`, auditar, async (c) => {
    await c.query(`UPDATE vendors SET status = 'active', plan = $2 WHERE id = $1`, [vendorId, plan]);
  });
}

export async function paymentByAsaasId(
  pool: Pool,
  asaasPaymentId: string,
): Promise<BillingPayment | null> {
  const { rows } = await pool.query<{
    id: string;
    account_id: string;
    event_id: string;
    asaas_payment_id: string;
    status: BillingPaymentStatus;
    plan: "celebration" | "vendor";
    amount_cents: number;
    invoice_url: string | null;
  }>(
    `SELECT id, account_id, event_id, asaas_payment_id, status, plan, amount_cents, invoice_url
       FROM billing_payments WHERE asaas_payment_id = $1`,
    [asaasPaymentId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    accountId: r.account_id,
    eventId: r.event_id,
    asaasPaymentId: r.asaas_payment_id,
    status: r.status,
    plan: r.plan,
    amountCents: r.amount_cents,
    invoiceUrl: r.invoice_url,
  };
}
