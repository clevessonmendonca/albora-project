import type { Pool } from "pg";

export type AccountAdminType = "host" | "vendor";

/**
 * `accounts` (anfitrião) não tem coluna de status — toda conta que existe já
 * é "active". Fornecedor tem `vendors.status` de verdade (trial/active/
 * suspended/churned, migration 0037); um anfitrião nunca aparece como
 * qualquer coisa além de "active" nesta versão (Lacunas).
 */
export type AccountAdminStatus = "trial" | "active" | "suspended" | "churned";

export type AccountAdminRow = {
  id: string;
  maskedEmail: string;
  type: AccountAdminType;
  plan: string | null;
  status: AccountAdminStatus;
  eventCount: number;
  createdAt: Date;
  /**
   * Bruto aqui (`Date | null`) — quem decora com o marcador de aproximação
   * (`ApproximateMetric`) é a camada de aplicação (`list-accounts.ts`), que
   * é dona do tipo. `accounts` não tem `last_seen_at`; a melhor fonte é
   * `MAX(host_sessions.created_at)`, que é o último LOGIN, não a última
   * ação (diferente de `staff_sessions.last_used_at`, Onda A).
   */
  lastAccessAt: Date | null;
};

/** `j••••@gmail.com` — nunca o e-mail cru. Local-part com 1-2 chars visíveis, resto mascarado; domínio intacto (é preciso identificar o provedor sem expor a caixa). */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••@••••";
  const visivel = local.slice(0, Math.min(2, local.length));
  return `${visivel}${"•".repeat(Math.max(local.length - visivel.length, 4))}@${domain}`;
}

type Cursor = { createdAt: string; id: string };
function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id } satisfies Cursor)).toString(
    "base64url",
  );
}
function decodeCursor(cursor: string): Cursor {
  return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Cursor;
}

export type ListAccountsAdminFilter = {
  type?: AccountAdminType;
  plan?: string;
  status?: AccountAdminStatus;
  search?: string;
  limit: number;
  cursor?: string;
};

/**
 * Cross-conta por desenho — chamado sob `withPlatformAggregation`.
 *
 * "tipo", "plano" e "status" são derivados (nenhuma coluna própria em
 * `accounts`): fornecedor se a conta está em `vendor_members`, senão
 * anfitrião. "plano" é `vendors.plan` para fornecedor, ou o `events.plan`
 * do evento mais recente para anfitrião. "status" é `vendors.status` para
 * fornecedor, ou sempre `'active'` para anfitrião.
 *
 * Os três filtros (tipo/plano/status) e a busca entram no `WHERE` da mesma
 * query que pagina — nunca como `.filter()` em JS depois do `LIMIT`. Filtrar
 * depois do banco quebraria duas coisas ao mesmo tempo: a contagem da barra
 * de ferramentas deixaria de refletir o conjunto filtrado (ela só vê o que
 * sobrou após o corte, não antes), e o cursor da próxima página passaria a
 * pular ou repetir linha sempre que um filtro descartasse a última linha
 * bruta da página.
 */
export async function listAccountsAdmin(
  pool: Pool,
  filter: ListAccountsAdminFilter,
): Promise<{ rows: AccountAdminRow[]; nextCursor: string | null }> {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.search) {
    params.push(`%${filter.search.toLowerCase()}%`);
    clauses.push(`email ILIKE $${params.length}`);
  }
  if (filter.type) {
    params.push(filter.type);
    clauses.push(`(CASE WHEN is_vendor THEN 'vendor' ELSE 'host' END) = $${params.length}`);
  }
  if (filter.plan) {
    params.push(filter.plan);
    clauses.push(`COALESCE(vendor_plan, event_plan) = $${params.length}`);
  }
  if (filter.status) {
    params.push(filter.status);
    clauses.push(`COALESCE(vendor_status, 'active') = $${params.length}`);
  }
  if (filter.cursor) {
    const c = decodeCursor(filter.cursor);
    params.push(c.createdAt, c.id);
    clauses.push(`(created_at, id) < ($${params.length - 1}, $${params.length})`);
  }
  params.push(filter.limit);
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const { rows } = await pool.query<{
    id: string;
    email: string;
    created_at: Date;
    is_vendor: boolean;
    vendor_plan: string | null;
    vendor_status: AccountAdminStatus | null;
    event_plan: string | null;
    event_count: number;
    last_access_at: Date | null;
  }>(
    `WITH base AS (
       SELECT a.id, a.email, a.created_at,
              EXISTS(SELECT 1 FROM vendor_members vm WHERE vm.account_id = a.id) AS is_vendor,
              (SELECT v.plan FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
                WHERE vm.account_id = a.id LIMIT 1) AS vendor_plan,
              (SELECT v.status FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
                WHERE vm.account_id = a.id LIMIT 1) AS vendor_status,
              (SELECT e.plan FROM events e WHERE e.account_id = a.id
                ORDER BY e.created_at DESC LIMIT 1) AS event_plan,
              (SELECT count(*)::int FROM events e WHERE e.account_id = a.id) AS event_count,
              (SELECT max(hs.created_at) FROM host_sessions hs WHERE hs.account_id = a.id) AS last_access_at
         FROM accounts a
     )
     SELECT id, email, created_at, is_vendor, vendor_plan, vendor_status, event_plan, event_count, last_access_at
       FROM base
       ${where}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params,
  );

  const mapped: AccountAdminRow[] = rows.map((r) => ({
    id: r.id,
    maskedEmail: maskEmail(r.email),
    type: r.is_vendor ? "vendor" : "host",
    plan: r.vendor_plan ?? r.event_plan,
    status: r.vendor_status ?? "active",
    eventCount: r.event_count,
    createdAt: r.created_at,
    lastAccessAt: r.last_access_at,
  }));

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === filter.limit && last ? encodeCursor(last.created_at, last.id) : null;
  return { rows: mapped, nextCursor };
}
