import type { Pool } from "pg";
import { comAgregacao, comConta } from "./event";

/** Já existe como CHECK em `vendor_members` (migration 0030). */
export type VendorRole = "admin" | "staff";

/** Já existe como CHECK em `vendors.plan` (migration 0037). */
export type VendorPlan = "starter" | "studio" | "agency";

/** Já existe como CHECK em `vendors.status` (migration 0037). */
export type VendorStatus = "trial" | "active" | "suspended" | "churned";

export class ErroSemAcessoAoFornecedor extends Error {
  readonly code = "vendor.no_access";
  constructor(readonly vendorId: string) {
    super("conta sem vínculo em vendor_members para este fornecedor");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Papel da conta no fornecedor. Irmão de `roleForAccountOnEvent`
 * (memberships.ts), mesma forma: `comConta`/`app.account_id`, `null` se não
 * pertence. O fornecedor é ortogonal a `HostEventRole` — nenhuma mudança lá.
 */
export async function roleForAccountOnVendor(
  pool: Pool,
  accountId: string,
  vendorId: string,
): Promise<VendorRole | null> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<{ role: string }>(
      `SELECT role FROM vendor_members WHERE vendor_id = $1 AND account_id = $2`,
      [vendorId, accountId],
    );
    const role = rows[0]?.role;
    if (role === "admin" || role === "staff") return role;
    return null;
  });
}

export type VendorMembership = {
  vendorId: string;
  name: string;
  slug: string | null;
  role: VendorRole;
};

/**
 * Fornecedores que esta conta administra ou em que atua como staff — irmã de
 * `roleForAccountOnVendor`, mesma porta (`comConta`/`app.account_id`).
 *
 * Alimenta o passo condicional do wizard de criação de evento
 * (spec-canal-fornecedor §2, item 4): "se a sessão de host tem
 * `vendor_members`, oferece criar sob aquele fornecedor". Nunca decide por
 * si só em que fornecedor o evento nasce — só lista o que a própria conta já
 * comprovadamente pertence; `criarEvento` reconfirma o pertencimento na
 * escrita.
 */
export async function vendorsDaConta(pool: Pool, accountId: string): Promise<VendorMembership[]> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<{
      vendor_id: string;
      name: string;
      slug: string | null;
      role: string;
    }>(
      `SELECT vm.vendor_id, v.name, v.slug, vm.role
         FROM vendor_members vm
         JOIN vendors v ON v.id = vm.vendor_id
        WHERE vm.account_id = $1
        ORDER BY v.name ASC`,
      [accountId],
    );
    return rows.map((r) => ({
      vendorId: r.vendor_id,
      name: r.name,
      slug: r.slug,
      role: r.role as VendorRole,
    }));
  });
}

/** Marca resolvida a partir do slug público, sem sessão de conta. */
export type MarcaPublicaDoFornecedor = {
  id: string;
  slug: string;
  name: string;
  brandTokens: Record<string, unknown>;
  plan: VendorPlan;
};

/** `slug` já é um segmento de URL — mesmo caractere que `event_slugs` aceita. */
const SLUG = /^[a-z0-9-]{1,80}$/;

/**
 * Resolve `vendorSlug → marca` para a landing pública do portal (spec §3), sem
 * exigir sessão de conta — o mesmo espírito de `resolverSlug` para eventos.
 *
 * `vendors` difere de `events`: a RLS forçada por `vendor_membro` (migration
 * 0037) não tem um GUC próprio tipo `app.event_id` que a query possa setar
 * para "só esta linha" — a política exige pertencimento em `vendor_members`,
 * que um visitante sem sessão nunca tem. Por isso a única porta legítima é
 * `comAgregacao`/`albora_agregador`, com `motivo` fixo e auditado, e a query
 * **fechada em duas frentes**: `WHERE slug = $1` (nunca um `SELECT` genérico)
 * e só as colunas de branding — nunca `vendor_members`, nunca dado de conta.
 *
 * Devolve `null` para slug desconhecido ou malformado (404 na borda, não erro
 * — a mesma semântica de `resolverSlug` devolvendo `"desconhecido"`).
 */
export async function marcaPublicaDoFornecedor(
  poolAgregacao: Pool,
  slug: string,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<MarcaPublicaDoFornecedor | null> {
  if (!SLUG.test(slug)) return null;

  return comAgregacao(poolAgregacao, `vendor_public_resolve:${slug}`, auditar, async (c) => {
    const { rows } = await c.query<{
      id: string;
      slug: string;
      name: string;
      brand_tokens: Record<string, unknown>;
      plan: string;
    }>(`SELECT id, slug, name, brand_tokens, plan FROM vendors WHERE slug = $1`, [slug]);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      brandTokens: row.brand_tokens ?? {},
      plan: row.plan as VendorPlan,
    };
  });
}

export type VendorEventSummary = {
  id: string;
  slug: string;
  title: string | null;
  packId: string;
  plan: string;
  expectedGuests: number;
  startsAt: Date;
  isDemo: boolean;
};

function mapVendorEventSummary(row: {
  id: string;
  slug: string;
  title: string | null;
  pack_id: string;
  plan: string;
  expected_guests: number;
  starts_at: Date;
  is_demo: boolean;
}): VendorEventSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    packId: row.pack_id,
    plan: row.plan,
    expectedGuests: row.expected_guests,
    startsAt: row.starts_at,
    isDemo: row.is_demo,
  };
}

/**
 * "Meus eventos" do painel do fornecedor — duas portas, nunca uma.
 *
 * 1. Confere pertencimento sob RLS normal (`comConta`/`app.account_id`), com
 *    `poolConta` — a pool comum do app, **sem** BYPASSRLS. Só entra em
 *    `comAgregacao` quem já provou que está em `vendor_members` daquele
 *    `vendor_id`. Se esta porta também rodasse sob BYPASSRLS, um bug nela
 *    abriria "qualquer conta vê qualquer fornecedor".
 * 2. SÓ ENTÃO cruza eventos com `comAgregacao`/`albora_agregador`, usando
 *    `poolAgregacao` — a pool conectada como o papel `BYPASSRLS` — com
 *    `motivo` fixo e `auditar()`. É a única rota autorizada a ler N eventos
 *    de contas potencialmente diferentes. A query é fechada por
 *    `WHERE vendor_id = $1` com `$1` já confirmado no passo 1 — nunca um
 *    `SELECT` genérico.
 *
 * 🔴 `poolConta` e `poolAgregacao` são pools DIFERENTES, conectadas com
 * credenciais diferentes (`albora_app` sem BYPASSRLS, `albora_agregador`
 * com BYPASSRLS). Passar a mesma pool nos dois argumentos quebra a
 * garantia: `comAgregacao` sobre uma conexão sem BYPASSRLS não estoura —
 * devolve silenciosamente zero linhas, porque a RLS de `events` continua
 * ativa e nenhum `app.event_id`/`app.account_id` foi setado na transação.
 */
export async function eventosDoFornecedor(
  poolConta: Pool,
  poolAgregacao: Pool,
  accountId: string,
  vendorId: string,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<VendorEventSummary[]> {
  if (!UUID.test(vendorId)) throw new ErroSemAcessoAoFornecedor(vendorId);

  const pertence = await comConta(poolConta, accountId, async (c) => {
    const { rowCount } = await c.query(
      `SELECT 1 FROM vendor_members WHERE vendor_id = $1 AND account_id = $2`,
      [vendorId, accountId],
    );
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) throw new ErroSemAcessoAoFornecedor(vendorId);

  return comAgregacao(poolAgregacao, `vendor_dashboard:${vendorId}`, auditar, async (c) => {
    const { rows } = await c.query<{
      id: string;
      slug: string;
      title: string | null;
      pack_id: string;
      plan: string;
      expected_guests: number;
      starts_at: Date;
      is_demo: boolean;
    }>(
      `SELECT id, slug, title, pack_id, plan, expected_guests, starts_at, is_demo
         FROM events
        WHERE vendor_id = $1
        ORDER BY starts_at DESC`,
      [vendorId],
    );
    return rows.map(mapVendorEventSummary);
  });
}
