import {
  eventosDoFornecedor,
  marcaPublicaDoFornecedor,
  resumoDoFornecedor,
  roleForAccountOnVendor,
  type MarcaPublicaDoFornecedor,
  type VendorEventSummary,
  type VendorRole,
  type VendorSubscriptionStatus,
  type ResumoDoFornecedor,
} from "@albora/db";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getAggregatorPool, getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { auditarAgregacaoDoPortal } from "../lib/audit";

export type VendorPortalContext = {
  vendor: MarcaPublicaDoFornecedor;
  role: VendorRole;
  eventos: VendorEventSummary[];
  resumo: ResumoDoFornecedor;
  subscriptionStatus: VendorSubscriptionStatus | null;
};

/** Status da assinatura inline (sem RLS, protegida por papel): `vendor.id` vem de `roleForAccountOnVendor`, nunca do cliente — evita dupla cobrança. */
async function latestSubscriptionStatus(vendorId: string): Promise<VendorSubscriptionStatus | null> {
  const { rows } = await getPool().query<{ status: VendorSubscriptionStatus }>(
    `SELECT status FROM vendor_subscriptions WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [vendorId],
  );
  return rows[0]?.status ?? null;
}

/** Portal do fornecedor: resolve marca (auditada) → exige sessão host → `roleForAccountOnVendor` como portão; quem não é admin/staff recebe 404. */
export async function loadVendorPortal(vendorSlug: string): Promise<VendorPortalContext> {
  // Auditoria gravada e AGUARDADA antes de sequer chamar `marcaPublicaDoFornecedor`
  // (que embrulha `comAgregacao`, BYPASSRLS) — se a escrita falhar, a exceção sobe
  // e a agregação cross-evento nunca roda. Ver auditarAgregacaoDoPortal.
  await auditarAgregacaoDoPortal(getPool(), null)({
    motivo: `vendor_public_resolve:${vendorSlug}`,
    em: new Date(),
  });
  const vendor = await marcaPublicaDoFornecedor(getAggregatorPool(), vendorSlug, () => {
    // Auditoria já gravada acima, aguardada, antes desta chamada — este callback
    // existe só porque `comAgregacao` o exige.
  });
  if (!vendor) notFound();

  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect(`/admin/sign-in?next=/f/${encodeURIComponent(vendorSlug)}`);

  const role = await roleForAccountOnVendor(getPool(), host.accountId, vendor.id);
  if (!role) notFound();

  await auditarAgregacaoDoPortal(getPool(), host.accountId, host.email)({
    motivo: `vendor_dashboard:${vendor.id}`,
    em: new Date(),
  });
  const eventos = await eventosDoFornecedor(
    getPool(),
    getAggregatorPool(),
    host.accountId,
    vendor.id,
    () => {
      // Auditoria já gravada acima, aguardada, antes desta chamada.
    },
  );

  await auditarAgregacaoDoPortal(getPool(), host.accountId, host.email)({
    motivo: `vendor_insights:${vendor.id}`,
    em: new Date(),
  });
  const resumo = await resumoDoFornecedor(
    getPool(),
    getAggregatorPool(),
    host.accountId,
    vendor.id,
    () => {},
  );

  const subscriptionStatus = await latestSubscriptionStatus(vendor.id);

  return { vendor, role, eventos, resumo, subscriptionStatus };
}
