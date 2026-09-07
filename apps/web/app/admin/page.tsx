import { listarEventosDoHost, type ResumoEvento } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { Badge } from "@albora/ui-web";
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

type StatusEvento = "vivo" | "agendado" | "encerrado";

function statusDoEvento(
  e: Pick<ResumoEvento, "comecaEm" | "terminaEm">,
  agora: Date,
): StatusEvento {
  if (e.terminaEm && e.terminaEm < agora) return "encerrado";
  if (e.comecaEm <= agora) return "vivo";
  return "agendado";
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
          <div aria-hidden className="mb-6 flex gap-1.5">
            <span className="h-9 w-1.5 rounded-pilula bg-acento" />
            <span className="h-9 w-1.5 rounded-pilula bg-acento opacity-40" />
            <span className="h-9 w-1.5 rounded-pilula bg-acento opacity-15" />
          </div>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">Bem-vindo ao Albora</h2>
          <p className="tipo-body m-0 mb-6 max-w-[44ch] text-ink-2">
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
            <span className="tipo-caption text-ink-3">
              {eventos.length} {eventos.length === 1 ? "evento" : "eventos"}
            </span>
            <Link href="/admin/new" className={adminClasses.primaryButtonSm}>
              + Novo evento
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {eventos.map((e) => {
              const pack = PACKS[e.packId];
              const tipo = pack ? resolvePackText(pack, "evento.nome") : e.packId;
              const nome = slugParaNome(e.slug);
              const status = statusDoEvento(e, agora);
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
                  className="group flex min-h-11 items-center justify-between gap-4 rounded-superficie border border-linha px-6 py-5 no-underline elev-1 transition-[transform,border-color] duration-instantaneo ease-mola hover:border-acento-texto active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p
                      className={`m-0 font-titulo text-[1.0625rem] ${
                        status === "encerrado" ? "text-ink-2" : "text-ink"
                      }`}
                    >
                      {nome}
                    </p>
                    <p className="m-0 mt-0.5 text-[0.8rem] capitalize text-ink-3">
                      {tipo} · {quando}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {status === "vivo" && (
                      <Badge tone="accent">
                        <span
                          aria-hidden
                          className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
                        />
                        ao vivo
                      </Badge>
                    )}
                    {status === "agendado" && <Badge tone="outline">agendado</Badge>}
                    {status === "encerrado" && <Badge tone="neutral">encerrado</Badge>}
                    <span
                      aria-hidden
                      className="text-ink-3 transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </div>
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
