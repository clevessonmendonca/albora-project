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

export default async function AdminPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const eventos = await listarEventosDoHost(getPool(), host.accountId);

  return (
    <AdminShell title="Seu painel" subtitle={host.email}>
      {eventos.length === 0 ? (
        <AdminSection>
          <h2 className="mb-3 mt-0 font-titulo text-lg font-light">
            Bem-vindo ao Albora
          </h2>
          <p className="mb-6 mt-0 max-w-[48ch] leading-relaxed text-ink-2">
            Crie seu primeiro evento em três minutos: escolha o nome, a data e a identidade visual.
            O QR e as placas saem prontos para impressão.
          </p>
          <Link href="/admin/new" className={adminClasses.primaryButton}>
            Criar seu primeiro evento
          </Link>
        </AdminSection>
      ) : (
        <>
          <AdminSection>
            <p className="mb-5 mt-0 max-w-[52ch] leading-relaxed text-ink-2">
              Durante a festa, abra o evento para pausar o telão ou ajustar configurações.
            </p>
            <Link href="/admin/new" className={adminClasses.primaryButton}>
              Criar novo evento
            </Link>
          </AdminSection>

          <AdminSection>
            <h2 className="mb-3 mt-0 font-titulo text-lg font-light tracking-titulo">
              Seus eventos
            </h2>
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
                      <span className="font-titulo tracking-titulo">{nome}</span>
                      <span className="mt-1 block text-[0.85rem] text-ink-3">
                        /{e.slug} · {quando}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </AdminSection>
        </>
      )}
    </AdminShell>
  );
}
