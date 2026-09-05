import type { Pool } from "pg";

export type VendorSubscriptionAdminRow = {
  vendorId: string;
  vendorName: string;
  /** id local (`vendor_subscriptions.id`) — alvo das mutações da T6, nunca exposto ao Asaas. */
  subscriptionId: string;
  /** id da assinatura no Asaas — é o que o `BillingProvider` recebe, nunca o `subscriptionId` local. */
  asaasSubscriptionId: string;
  plan: "starter" | "studio" | "agency";
  status: "pending" | "active" | "overdue" | "canceled";
  /**
   * Não existe coluna de vencimento em `vendor_subscriptions` (migration
   * 0037) — o Asaas sabe, o banco local não guarda (reconhecimento da T7).
   * Sempre `null`; a tela mostra sempre `—`, nunca estima nem chama a API
   * do Asaas pra preencher.
   */
  nextChargeAt: null;
  /**
   * Bruto aqui (`number | null`) — quem decora com o marcador de
   * aproximação (`ApproximateMetric`) é a camada de aplicação
   * (`list-subscriptions.ts`), dona do tipo — mesmo padrão de `lastAccessAt`
   * em `accounts-admin.ts`. `null` quando `status !== 'overdue'`; quando
   * overdue, é `extract(day from now() - updated_at)` — aproximação porque
   * não existe `overdue_since` dedicado, só é exata se nada mais tocar
   * `updated_at` enquanto a assinatura segue em atraso.
   */
  overdueDays: number | null;
};

export type ListVendorSubscriptionsAdminFilter = {
  status?: VendorSubscriptionAdminRow["status"];
  limit: number;
};

/**
 * Cross-vendor por desenho — chamado sob `withPlatformAggregation`, mesma
 * disciplina de `listAccountsAdmin`/`listEventsAdmin` (T4/T6).
 *
 * Sem cursor: volume de assinatura de fornecedor é ordens de magnitude menor
 * que conta ou evento nesta fase do produto (canal B2B2C ainda em rollout,
 * spec §8.1.5) — paginação por cursor aqui seria complexidade sem tela que
 * a exija ainda; se o volume crescer, a mesma forma de `listAccountsAdmin`
 * se aplica sem quebrar o contrato (`nextCursor: string | null`).
 */
export async function listVendorSubscriptionsAdmin(
  pool: Pool,
  filter: ListVendorSubscriptionsAdminFilter,
): Promise<{ rows: VendorSubscriptionAdminRow[]; nextCursor: null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`vs.status = $${params.length}`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    subscription_id: string;
    asaas_subscription_id: string;
    vendor_id: string;
    vendor_name: string;
    plan: VendorSubscriptionAdminRow["plan"];
    status: VendorSubscriptionAdminRow["status"];
    overdue_days: number | null;
  }>(
    `SELECT vs.id AS subscription_id, vs.asaas_subscription_id, vs.vendor_id, v.name AS vendor_name, vs.plan, vs.status,
            CASE WHEN vs.status = 'overdue'
                 THEN extract(day FROM now() - vs.updated_at)::int
                 ELSE NULL
            END AS overdue_days
       FROM vendor_subscriptions vs
       JOIN vendors v ON v.id = vs.vendor_id
       ${where}
      ORDER BY vs.created_at DESC
      LIMIT $${params.length}`,
    params,
  );

  return {
    rows: rows.map((r) => ({
      vendorId: r.vendor_id,
      vendorName: r.vendor_name,
      subscriptionId: r.subscription_id,
      asaasSubscriptionId: r.asaas_subscription_id,
      plan: r.plan,
      status: r.status,
      nextChargeAt: null,
      overdueDays: r.overdue_days,
    })),
    nextCursor: null,
  };
}
