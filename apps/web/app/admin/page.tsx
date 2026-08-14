import { listarEventosDoHost } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import {
  AdminShell,
  AdminSection,
  adminClasses,
} from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

export default async function Pagina() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const eventos = await listarEventosDoHost(getPool(), host.accountId);

  return (
    <AdminShell title="Seu painel" subtitle={host.email}>
      <AdminSection>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          Durante a festa, abra o evento para pausar o telão ou marcar que há menores.
          Crie um evento novo quando precisar.
        </p>
        <Link href="/admin/new" className={adminClasses.primaryButton}>
          Criar evento
        </Link>
      </AdminSection>

      {eventos.length > 0 && (
        <AdminSection>
          <h2 className="mb-2 mt-0 font-titulo text-lg">Seus eventos</h2>
          <ul className="m-0 list-none p-0">
            {eventos.map((e) => {
              const pack = PACKS[e.packId];
              const nome = pack ? resolvePackText(pack, "evento.nome") : e.slug;
              const quando = e.comecaEm.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li key={e.eventoId}>
                  <Link href={`/admin/e/${e.eventoId}`} className={adminClasses.listLink}>
                    <span className="font-titulo">{nome}</span>
                    <span className="block text-[0.85rem] text-ink-3">
                      /{e.slug} · {quando}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </AdminSection>
      )}
    </AdminShell>
  );
}
