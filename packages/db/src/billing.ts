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

/** Índice parcial fecha a race condition que o SELECT só reduz — 23505 = assinatura duplicada; devolver 409, não 500. */
export function ehAssinaturaDuplicada(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

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

export async function aplicarPlanoPago(
  pool: Pool,
  eventId: string,
  plan: Extract<PlanoDoEvento, "celebration" | "vendor">,
): Promise<void> {
  await comEvento(pool, eventId, async (c: PoolClient) => {
    await c.query(`UPDATE events SET plan = $2 WHERE id = $1`, [eventId, plan]);
  });
}

export type VendorSubscriptionStatus = "pending" | "active" | "overdue" | "canceled";

export type VendorSubscription = {
  id: string;
  vendorId: string;
  accountId: string;
  asaasSubscriptionId: string;
  status: VendorSubscriptionStatus;
  plan: VendorPlan;
  pendingPlan: VendorPlan | null;
  cancelRequestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Não confere roleForAccountOnVendor — impossível sob RLS sem duplicar a consulta; o chamador deve verificar antes. */
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
    pendingPlan: null,
    cancelRequestedAt: null,
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
        SET status = $2,
            plan = CASE WHEN $2 = 'active' THEN COALESCE(pending_plan, plan) ELSE plan END,
            pending_plan = CASE WHEN $2 IN ('active', 'canceled') THEN NULL ELSE pending_plan END,
            updated_at = now()
      WHERE asaas_subscription_id = $1
      RETURNING vendor_id, account_id, plan`,
    [asaasSubscriptionId, status],
  );
  const row = rows[0];
  if (!row) return null;
  return { vendorId: row.vendor_id, accountId: row.account_id, plan: row.plan };
}

export type VendorSubscriptionForVendor = VendorSubscription;

/** Tabela sem RLS: o chamador precisa confirmar previamente que a conta é admin do vendor. */
export async function latestVendorSubscriptionForVendor(
  pool: Pool,
  vendorId: string,
): Promise<VendorSubscriptionForVendor | null> {
  const { rows } = await pool.query<{
    id: string;
    vendor_id: string;
    account_id: string;
    asaas_subscription_id: string;
    status: VendorSubscriptionStatus;
    plan: VendorPlan;
    pending_plan: VendorPlan | null;
    cancel_requested_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT id, vendor_id, account_id, asaas_subscription_id, status, plan,
            pending_plan, cancel_requested_at, created_at, updated_at
       FROM vendor_subscriptions
      WHERE vendor_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [vendorId],
  );
  const row = rows[0];
  return row
    ? {
        id: row.id,
        vendorId: row.vendor_id,
        accountId: row.account_id,
        asaasSubscriptionId: row.asaas_subscription_id,
        status: row.status,
        plan: row.plan,
        pendingPlan: row.pending_plan,
        cancelRequestedAt: row.cancel_requested_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

export async function recordVendorSubscriptionPlanChange(
  client: PoolClient,
  subscriptionId: string,
  vendorId: string,
  plan: VendorPlan,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE vendor_subscriptions
        SET pending_plan = $3, updated_at = now()
      WHERE id = $1 AND vendor_id = $2
        AND status IN ('active', 'overdue')
        AND cancel_requested_at IS NULL`,
    [subscriptionId, vendorId, plan],
  );
  return (result.rowCount ?? 0) === 1;
}

export async function recordVendorSubscriptionCancellationRequest(
  client: PoolClient,
  subscriptionId: string,
  vendorId: string,
): Promise<boolean> {
  const result = await client.query(
    `UPDATE vendor_subscriptions
        SET cancel_requested_at = now(), pending_plan = NULL, updated_at = now()
      WHERE id = $1 AND vendor_id = $2
        AND status <> 'canceled'
        AND cancel_requested_at IS NULL`,
    [subscriptionId, vendorId],
  );
  return (result.rowCount ?? 0) === 1;
}

/** 🔴 vendors não tem escape por app.event_id — webhook sem sessão não tem vendor_membro. Usa comAgregacao (BYPASSRLS, auditado), nunca UPDATE sem filtro. */
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

export type BillingPaymentSummaryAdmin = {
  id: string;
  status: BillingPaymentStatus;
  plan: "celebration" | "vendor";
  amountCents: number;
  createdAt: Date;
};

/** Cross-conta por desenho — chamada sob `withPlatformAggregation` (mesa de suporte, T5; reembolso, T6). */
export async function listBillingPaymentsForAccountAdmin(
  pool: Pool,
  accountId: string,
  limit = 20,
): Promise<BillingPaymentSummaryAdmin[]> {
  const { rows } = await pool.query<{
    id: string; status: BillingPaymentStatus; plan: "celebration" | "vendor";
    amount_cents: number; created_at: Date;
  }>(
    `SELECT id, status, plan, amount_cents, created_at
       FROM billing_payments WHERE account_id = $1
      ORDER BY created_at DESC LIMIT $2`,
    [accountId, limit],
  );
  return rows.map((r) => ({ id: r.id, status: r.status, plan: r.plan, amountCents: r.amount_cents, createdAt: r.created_at }));
}

export type VendorSubscriptionByIdAdmin = {
  id: string;
  vendorId: string;
  accountId: string;
  asaasSubscriptionId: string;
  plan: VendorPlan;
  status: VendorSubscriptionStatus;
};

/** Cross-conta por desenho — usada pelos comandos de mutação (T6), nunca pela leitura da tela (que já tem `subscriptionId` embutido). */
export async function getVendorSubscriptionByIdAdmin(
  pool: Pool,
  subscriptionId: string,
): Promise<VendorSubscriptionByIdAdmin | null> {
  const { rows } = await pool.query<{
    id: string;
    vendor_id: string;
    account_id: string;
    asaas_subscription_id: string;
    plan: VendorPlan;
    status: VendorSubscriptionStatus;
  }>(
    "SELECT id, vendor_id, account_id, asaas_subscription_id, plan, status FROM vendor_subscriptions WHERE id = $1",
    [subscriptionId],
  );
  const r = rows[0];
  return r
    ? {
        id: r.id,
        vendorId: r.vendor_id,
        accountId: r.account_id,
        asaasSubscriptionId: r.asaas_subscription_id,
        plan: r.plan,
        status: r.status,
      }
    : null;
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

export type RefundablePaymentRow = {
  id: string;
  asaasPaymentId: string;
  amountCents: number;
  status: Extract<BillingPaymentStatus, "confirmed" | "received">;
  paidAt: Date | null;
};

/**
 * Vínculo vendor → pagamento: `billing_payments.account_id` é a conta que
 * pagou (o host do evento, não o fornecedor) — `vendor_members` não entra
 * aqui, e checar por ele daria zero linhas sempre (é o pertencimento do
 * PRÓPRIO fornecedor, não uma lista de contas dele). O vínculo real é
 * `billing_payments.event_id → events.vendor_id` (schema confirmado:
 * `events.vendor_id` nasce na migration 0001; a migration 0037 indexa
 * `events (vendor_id, starts_at)` exatamente para leituras como esta).
 *
 * Cross-evento por desenho — chamada sob `withPlatformAggregation`, mesma
 * disciplina de `listBillingPaymentsForAccountAdmin`/`getAccountDetailAdmin`:
 * `events` tem RLS FORÇADA por `app.event_id` (migration 0001), então
 * listar pagamentos de TODOS os eventos de um fornecedor de uma vez exige
 * o papel agregador — sob o pool comum isso devolveria sempre zero linhas,
 * não um erro.
 *
 * "Reembolsável" é `confirmed` ou `received` — nunca `refunded`/`deleted`
 * (já não há dinheiro a devolver) nem `pending`/`overdue` (ainda não houve
 * cobrança confirmada).
 */
export async function listRefundablePaymentsForVendor(pool: Pool, vendorId: string): Promise<RefundablePaymentRow[]> {
  const { rows } = await pool.query<{
    id: string;
    asaas_payment_id: string;
    amount_cents: number;
    status: "confirmed" | "received";
    paid_at: Date | null;
  }>(
    `SELECT bp.id, bp.asaas_payment_id, bp.amount_cents, bp.status, bp.paid_at
       FROM billing_payments bp
       JOIN events e ON e.id = bp.event_id
      WHERE e.vendor_id = $1
        AND bp.status IN ('confirmed', 'received')
      ORDER BY bp.paid_at DESC NULLS LAST, bp.created_at DESC`,
    [vendorId],
  );
  return rows.map((r) => ({
    id: r.id,
    asaasPaymentId: r.asaas_payment_id,
    amountCents: r.amount_cents,
    status: r.status,
    paidAt: r.paid_at,
  }));
}
