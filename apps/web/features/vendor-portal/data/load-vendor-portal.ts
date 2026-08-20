import {
  eventosDoFornecedor,
  marcaPublicaDoFornecedor,
  roleForAccountOnVendor,
  type MarcaPublicaDoFornecedor,
  type VendorEventSummary,
  type VendorRole,
  type VendorSubscriptionStatus,
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
  subscriptionStatus: VendorSubscriptionStatus | null;
};

/**
 * Status da assinatura mais recente do fornecedor — query inline, não em
 * `@albora/db`: `vendor_subscriptions` não tem RLS própria (protegida por
 * papel na app layer), então o `WHERE vendor_id = $1` é a única contenção, e
 * usa sempre `vendor.id` já resolvido/portado por `roleForAccountOnVendor`
 * acima — nunca um valor vindo do cliente. Existe para fechar a lacuna que o
 * botão de assinar relatou: sem o status, admin clica "assinar" duas vezes e
 * gera duas cobranças `pending`.
 */
async function latestSubscriptionStatus(vendorId: string): Promise<VendorSubscriptionStatus | null> {
  const { rows } = await getPool().query<{ status: VendorSubscriptionStatus }>(
    `SELECT status FROM vendor_subscriptions WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [vendorId],
  );
  return rows[0]?.status ?? null;
}

/**
 * Carrega o painel "meus eventos" do fornecedor (`/f/[vendorSlug]`, spec
 * §1.2/§6 do canal do fornecedor).
 *
 * Três passos, cada um falhando para `notFound()`/`redirect()` em vez de
 * seguir com um estado parcial:
 *
 * 1. Resolve a marca pública pelo slug — via `withAggregation`, auditado, só
 *    branding (§3 do spec). Slug desconhecido é 404, não erro: mesma
 *    semântica de `resolverSlug` para o slug do convidado.
 * 2. Exige sessão de host. Sem cookie válido, manda para o login do
 *    anfitrião — a mesma sessão que já serve `/admin`, porque o fornecedor
 *    é papel ortogonal (vendor_members), não uma conta de tipo diferente.
 * 3. `roleForAccountOnVendor` é o portão: quem não é admin/staff daquele
 *    `vendor.id` recebe 404, nunca a lista. `eventosDoFornecedor` repete a
 *    checagem de pertencimento por dentro (defesa em profundidade — a mesma
 *    invariante em duas camadas independentes) antes de cruzar `vendor_id`
 *    pela pool agregadora.
 */
export async function loadVendorPortal(vendorSlug: string): Promise<VendorPortalContext> {
  const vendor = await marcaPublicaDoFornecedor(
    getAggregatorPool(),
    vendorSlug,
    auditarAgregacaoDoPortal,
  );
  if (!vendor) notFound();

  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const role = await roleForAccountOnVendor(getPool(), host.accountId, vendor.id);
  if (!role) notFound();

  const eventos = await eventosDoFornecedor(
    getPool(),
    getAggregatorPool(),
    host.accountId,
    vendor.id,
    auditarAgregacaoDoPortal,
  );

  const subscriptionStatus = await latestSubscriptionStatus(vendor.id);

  return { vendor, role, eventos, subscriptionStatus };
}
