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

function slugParaNome(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in");

  const eventos = await listarEventosDoHost(getPool(), host.accountId);

  const agora = new Date();
  // Qual pack sugerir vem do próprio pack, nunca de string aqui. Só sugere
  // enquanto dá tempo de usar, e some assim que o anfitrião já criou um.
  const sugerido = eventos
    .filter((e) => !e.terminaEm || e.terminaEm >= agora)
    .map((e) => PACKS[e.packId]?.sugereAntes)
    .find((id): id is string => Boolean(id && PACKS[id]));

  const packSugerido =
    sugerido && !eventos.some((e) => e.packId === sugerido) ? PACKS[sugerido] : undefined;

  return (
    <AdminShell title="Seu painel" subtitle={host.email}>
      {eventos.length === 0 ? (
        <AdminSection>
          <div className="mb-6 flex gap-1.5">
            <span className="h-9 w-1.5 rounded-pilula bg-acento" />
            <span className="h-9 w-1.5 rounded-pilula bg-acento opacity-40" />
            <span className="h-9 w-1.5 rounded-pilula bg-acento opacity-15" />
          </div>
          <h2 className="mb-2 mt-0 font-titulo text-xl font-light">
            Bem-vindo ao Albora
          </h2>
          <p className="mb-6 mt-0 max-w-[44ch] leading-relaxed text-ink-2">
            Crie seu primeiro evento em três minutos: escolha o nome, a data e
            a identidade visual. O QR e as placas saem prontos para impressão.
          </p>
          <Link href="/admin/new" className={adminClasses.primaryButton}>
            Criar meu primeiro evento
          </Link>
        </AdminSection>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[0.875rem] text-ink-3">
              {eventos.length} {eventos.length === 1 ? "evento" : "eventos"}
            </span>
            <Link href="/admin/new" className={adminClasses.primaryButtonSm}>
              + Novo evento
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {eventos.map((e) => {
              const pack = PACKS[e.packId];
              const tipo = pack ? resolvePackText(pack, "evento.nome") : e.packId;
              const nome = slugParaNome(e.slug);
              const aoVivo =
                e.comecaEm <= agora && (!e.terminaEm || e.terminaEm >= agora);
              const passado = e.terminaEm ? e.terminaEm < agora : false;
              const quando = e.comecaEm.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "short",
                year:
                  e.comecaEm.getFullYear() !== agora.getFullYear()
                    ? "numeric"
                    : undefined,
              });
              return (
                <Link
                  key={e.eventoId}
                  href={`/admin/e/${e.eventoId}`}
                  className="flex items-center justify-between gap-4 rounded-superficie border border-linha bg-superficie px-5 py-4 no-underline shadow-suave transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
                >
                  <div className="min-w-0">
                    <p
                      className={`m-0 font-titulo text-[1.0625rem] ${
                        passado ? "text-ink-2" : "text-ink"
                      }`}
                    >
                      {nome}
                    </p>
                    <p className="m-0 mt-0.5 text-[0.8rem] capitalize text-ink-3">
                      {tipo} · {quando}
                    </p>
                  </div>
                  {aoVivo ? (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-pilula bg-acento px-2.5 py-1 font-titulo text-[0.7rem] uppercase tracking-rotulo text-sobre-acento">
                      <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />
                      ao vivo
                    </span>
                  ) : (
                    <span className="shrink-0 text-ink-3 transition-transform duration-[var(--tempo-rapido)] group-hover:translate-x-0.5">
                      →
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {packSugerido && (
            <div className="mt-4 rounded-superficie border border-linha bg-superficie-alta px-5 py-4">
              <p className="m-0 font-titulo text-[1.0625rem] text-ink">
                {resolvePackText(packSugerido, "sugestao.titulo")}
              </p>
              <p className="m-0 mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
                {resolvePackText(packSugerido, "sugestao.lede")}
              </p>
              <Link
                href="/admin/new"
                className={`${adminClasses.primaryButtonSm} mt-3.5 inline-flex`}
              >
                {resolvePackText(packSugerido, "sugestao.cta")}
              </Link>
            </div>
          )}
        </div>
      )}
      <p className="mt-6 text-[0.8125rem] text-ink-3">
        Cerimonialista ou espaço de festas?{" "}
        <Link href="/admin/vendor/new" className="text-ink-2 underline">
          Crie o portal do fornecedor
        </Link>
        .
      </p>
    </AdminShell>
  );
}
