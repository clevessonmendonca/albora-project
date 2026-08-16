import type { Pool, PoolClient } from "pg";
import { comEvento } from "./event";
import type { PlanoDoEvento } from "@albora/core";

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
