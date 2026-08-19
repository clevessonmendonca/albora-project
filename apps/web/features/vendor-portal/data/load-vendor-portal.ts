import {
  eventosDoFornecedor,
  marcaPublicaDoFornecedor,
  roleForAccountOnVendor,
  type MarcaPublicaDoFornecedor,
  type VendorEventSummary,
  type VendorRole,
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
};

/**
 * Carrega o painel "meus eventos" do fornecedor (`/f/[vendorSlug]`, spec
 * §1.2/§6 do canal do fornecedor).
 *
 * Três passos, cada um falhando para `notFound()`/`redirect()` em vez de
 * seguir com um estado parcial:
 *
 * 1. Resolve a marca pública pelo slug — via `comAgregacao`, auditado, só
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

  return { vendor, role, eventos };
}
