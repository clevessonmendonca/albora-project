import type { Pool } from "pg";
import { comEvento } from "./event";
import { aceitesDeEntradaPorVersao, type AceiteDeConsentimento } from "./consent-db";

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

export type AccountEventSummary = { id: string; title: string | null; startsAt: Date; status: string };

export type AccountDetailAdmin = AccountAdminRow & {
  events: AccountEventSummary[];
  consentsByVersion: AceiteDeConsentimento[];
};

/**
 * Sob `withPlatformAggregation` — mesma leitura cross-tenant de
 * `listAccountsAdmin`, agora para uma conta só (tela Conta — detalhe,
 * §8.1.3). Tipo/plano/status seguem a mesma derivação da listagem: nenhuma
 * coluna própria em `accounts`, então fornecedor vs. anfitrião sai de
 * `vendor_members`, e o status de anfitrião é sempre `'active'` (ver
 * comentário de `AccountAdminStatus`).
 *
 * Consentimentos entram só como contagem agregada por versão
 * (`aceitesDeEntradaPorVersao`) — nunca nome de convidado; é por isso que
 * a leitura passa por `comEvento` (RLS por `event_id`) evento a evento, em
 * vez de uma única query cross-evento direto no agregador.
 */
export async function getAccountDetailAdmin(pool: Pool, accountId: string): Promise<AccountDetailAdmin | null> {
  const { rows } = await pool.query<{
    id: string;
    email: string;
    created_at: Date;
    is_vendor: boolean;
    vendor_plan: string | null;
    vendor_status: AccountAdminStatus | null;
    event_plan: string | null;
    last_access_at: Date | null;
  }>(
    `SELECT a.id, a.email, a.created_at,
            EXISTS(SELECT 1 FROM vendor_members vm WHERE vm.account_id = a.id) AS is_vendor,
            (SELECT v.plan FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
              WHERE vm.account_id = a.id LIMIT 1) AS vendor_plan,
            (SELECT v.status FROM vendor_members vm JOIN vendors v ON v.id = vm.vendor_id
              WHERE vm.account_id = a.id LIMIT 1) AS vendor_status,
            (SELECT e.plan FROM events e WHERE e.account_id = a.id
              ORDER BY e.created_at DESC LIMIT 1) AS event_plan,
            (SELECT max(hs.created_at) FROM host_sessions hs WHERE hs.account_id = a.id) AS last_access_at
       FROM accounts a WHERE a.id = $1`,
    [accountId],
  );
  const conta = rows[0];
  if (!conta) return null;

  const { rows: eventos } = await pool.query<{ id: string; title: string | null; starts_at: Date; status: string }>(
    `SELECT id, title, starts_at, status FROM events WHERE account_id = $1 ORDER BY starts_at DESC`,
    [accountId],
  );

  const consentsByVersion: AceiteDeConsentimento[] = [];
  for (const evento of eventos) {
    const aceites = await comEvento(pool, evento.id, (c) => aceitesDeEntradaPorVersao(c, evento.id));
    consentsByVersion.push(...aceites);
  }

  return {
    id: conta.id,
    maskedEmail: maskEmail(conta.email),
    type: conta.is_vendor ? "vendor" : "host",
    plan: conta.vendor_plan ?? conta.event_plan,
    status: conta.vendor_status ?? "active",
    eventCount: eventos.length,
    createdAt: conta.created_at,
    lastAccessAt: conta.last_access_at,
    events: eventos.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, status: e.status })),
    consentsByVersion,
  };
}
