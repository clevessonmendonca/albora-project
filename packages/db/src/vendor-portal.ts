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

/** Só lista — criarEvento reconfirma o pertencimento na escrita; esta função não autoriza nada. */
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

/** 🔴 vendors sem GUC próprio: RLS exige pertencimento em vendor_members, que visitante sem sessão não tem. Usa comAgregacao; query fechada em WHERE slug = $1 — nunca vendor_members, nunca dado de conta. */
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

/** 🔴 Duas pools distintas obrigatórias: poolConta (sem BYPASSRLS) verifica pertencimento; poolAgregacao (BYPASSRLS, auditado) cruza eventos. Mesma pool nos dois argumentos silencia zero linhas sem erro. */
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

const HEX_COR = /^#[0-9a-fA-F]{6}$/;

function corHexValida(v: unknown): v is string {
  return typeof v === "string" && HEX_COR.test(v);
}

export type BrandTokensDoFornecedor = {
  cores?: {
    acento?: string;
    papel?: string;
    noite?: string;
    tinta?: string;
  };
  background?: "light" | "dark";
};

export class ErroBrandTokensInvalidos extends Error {
  readonly code = "vendor.brand_tokens_invalidos";
  constructor(readonly campos: string[]) {
    super("brand_tokens com campos inválidos: " + campos.join(", "));
  }
}

/** comConta confirma pertencimento; hex de cores passou por corHexValida — nunca literal sem validação. */
export async function atualizarBrandTokensDoFornecedor(
  pool: Pool,
  accountId: string,
  vendorId: string,
  tokens: BrandTokensDoFornecedor,
): Promise<boolean> {
  const campos: string[] = [];

  const coresEntradas = tokens.cores ?? {};
  for (const [chave, valor] of Object.entries(coresEntradas)) {
    if (valor !== undefined && valor !== null && !corHexValida(valor)) {
      campos.push(`cores.${chave}`);
    }
  }
  const bg = tokens.background;
  if (bg !== undefined && bg !== "light" && bg !== "dark") {
    campos.push("background");
  }
  if (campos.length > 0) throw new ErroBrandTokensInvalidos(campos);

  return comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE vendors
          SET brand_tokens = brand_tokens || $1::jsonb
        WHERE id = $2
          AND id IN (SELECT vendor_id FROM vendor_members WHERE account_id = $3)`,
      [JSON.stringify(tokens), vendorId, accountId],
    );
    return (rowCount ?? 0) > 0;
  });
}

export type ResumoDoFornecedor = {
  totalEventos: number;
  totalFotos: number;
  h1Medio: number;
};

/** Mesma guarda de duas portas de eventosDoFornecedor. Duas queries (não JOIN) — um JOIN events×uploads inflaria sum(expected_guests) uma vez por foto. */
export async function resumoDoFornecedor(
  poolConta: Pool,
  poolAgregacao: Pool,
  accountId: string,
  vendorId: string,
  auditar: (registro: { motivo: string; em: Date }) => void,
): Promise<ResumoDoFornecedor> {
  if (!UUID.test(vendorId)) throw new ErroSemAcessoAoFornecedor(vendorId);

  const pertence = await comConta(poolConta, accountId, async (c) => {
    const { rowCount } = await c.query(
      `SELECT 1 FROM vendor_members WHERE vendor_id = $1 AND account_id = $2`,
      [vendorId, accountId],
    );
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) throw new ErroSemAcessoAoFornecedor(vendorId);

  return comAgregacao(poolAgregacao, `vendor_insights:${vendorId}`, auditar, async (c) => {
    const [{ rows: eventosRows }, { rows: uploadsRows }] = await Promise.all([
      c.query<{ total_eventos: number; total_esperados: number }>(
        `SELECT count(*)::int AS total_eventos, coalesce(sum(expected_guests), 0)::int AS total_esperados
           FROM events
          WHERE vendor_id = $1`,
        [vendorId],
      ),
      c.query<{ total_sessoes_com_upload: number; total_fotos: number }>(
        `SELECT count(DISTINCT u.session_id)::int AS total_sessoes_com_upload,
                count(*)::int AS total_fotos
           FROM uploads u
           JOIN events e ON e.id = u.event_id
          WHERE e.vendor_id = $1 AND u.state = 'published'`,
        [vendorId],
      ),
    ]);

    const totalEventos = eventosRows[0]?.total_eventos ?? 0;
    const totalEsperados = eventosRows[0]?.total_esperados ?? 0;
    const totalSessoesComUpload = uploadsRows[0]?.total_sessoes_com_upload ?? 0;
    const totalFotos = uploadsRows[0]?.total_fotos ?? 0;

    return {
      totalEventos,
      totalFotos,
      h1Medio: totalEsperados > 0 ? totalSessoesComUpload / totalEsperados : 0,
    };
  });
}
