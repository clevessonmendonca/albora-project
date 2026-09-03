import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listarEventosDoHost, resumoDoFornecedor, vendorsDaConta } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getAggregatorPool, getPool } from "@/lib/db";
import { AdminShell, AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { VendorSummaryCard } from "@/features/vendor-portal/components/server/vendor-summary-card";
import { auditarAgregacaoDoPortal } from "@/features/vendor-portal/lib/audit";

export const dynamic = "force-dynamic";

/** `resumoDoFornecedor` revalida pertencimento antes de cruzar `vendor_id` pela pool agregadora — defesa em profundidade. */
export default async function VendorInsightsPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/admin/vendor/insights");

  const [eventos, vendors] = await Promise.all([
    listarEventosDoHost(getPool(), host.accountId),
    vendorsDaConta(getPool(), host.accountId),
  ]);

  const resumos = await Promise.all(
    vendors.map(async (vendor) => ({
      vendor,
      resumo: await resumoDoFornecedor(
        getPool(),
        getAggregatorPool(),
        host.accountId,
        vendor.vendorId,
        auditarAgregacaoDoPortal,
      ),
    })),
  );

  return (
    <AdminShell
      title="Insights do fornecedor"
      subtitle="Visão geral dos seus eventos"
      back={{ label: "Painel", href: "/admin" }}
    >
      <AdminSection>
        <p className="m-0 leading-relaxed text-ink-2">
          Compare a participação (H1) entre festas sem precisar abrir o álbum de cada uma.
          Para ver detalhes de uma noite específica, clique no evento abaixo.
        </p>
      </AdminSection>

      {resumos.length > 0 && (
        <div className="flex flex-col gap-3">
          {resumos.map(({ vendor, resumo }) => (
            <div key={vendor.vendorId} className="flex flex-col gap-2">
              <VendorSummaryCard vendorName={vendor.name} resumo={resumo} />
              {vendor.role === "admin" && (
                <Link
                  href={`/admin/vendor/${vendor.vendorId}/settings`}
                  className="self-end text-[0.8125rem] text-ink-3 underline"
                >
                  Configurações do fornecedor
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {eventos.length === 0 ? (
        <AdminSection>
          <div className="py-8 text-center">
            <p className="mb-2 mt-0 text-[0.9375rem] text-ink">
              Nenhum evento criado ainda
            </p>
            <p className="m-0 text-[0.8125rem] leading-relaxed text-ink-3">
              Crie seu primeiro evento para começar a acompanhar insights e participação dos
              convidados em tempo real.
            </p>
          </div>
        </AdminSection>
      ) : (
        <AdminSection>
          <p className="mb-3 mt-0 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
            Seus eventos ({eventos.length})
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {eventos.map((e) => (
              <li key={e.eventoId}>
                <Link href={`/admin/e/${e.eventoId}/insights`} className={adminClasses.listLink}>
                  <span className="font-titulo">/{e.slug}</span>
                  <span className="block text-[0.85rem] text-ink-3">
                    {e.comecaEm.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </AdminSection>
      )}
    </AdminShell>
  );
}
