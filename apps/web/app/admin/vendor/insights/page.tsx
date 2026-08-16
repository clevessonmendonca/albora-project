import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listarEventosDoHost } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { AdminShell, AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

/**
 * Insights do cerimonialista — lista agregada dos eventos da conta.
 * Sem nomes de convidado, sem thumbs. H1 por festa quando o funil existir.
 */
export default async function VendorInsightsPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/admin/vendor/insights");

  const eventos = await listarEventosDoHost(getPool(), host.accountId);

  return (
    <AdminShell
      title="Insights do fornecedor"
      subtitle="Portfólio · só agregados"
      back={{ label: "Painel", href: "/admin" }}
    >
      <AdminSection>
        <p className="m-0 leading-relaxed text-ink-2">
          Compare H1 entre festas sem abrir álbum. Detalhe de uma noite: abra Insights no
          evento.
        </p>
      </AdminSection>

      {eventos.length === 0 ? (
        <AdminSection>
          <p className="m-0 text-ink-3">Nenhum evento ainda.</p>
        </AdminSection>
      ) : (
        <AdminSection>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {eventos.map((e) => (
              <li key={e.eventoId}>
                <Link href={`/admin/e/${e.eventoId}/insights`} className={adminClasses.listLink}>
                  <span className="font-titulo">/{e.slug}</span>
                  <span className="block text-[0.85rem] text-ink-3">
                    {e.comecaEm.toLocaleDateString("pt-BR")}
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
