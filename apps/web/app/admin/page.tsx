import { faseDoEvento } from "@albora/core";
import { listarEventosDoHost } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import { Badge } from "@albora/ui-web";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getPool } from "@/lib/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { AdminShell } from "@/features/admin/components/server/admin-shell";
import {
  botaoDoPainel,
  Cartao,
  IntroDaPagina,
  NotaVazia,
} from "@/features/admin/components/server/kit-do-painel";
import { monograma } from "@/features/admin/lib/monograma";

export const dynamic = "force-dynamic";

function slugParaNome(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
    <AdminShell subtitle={host.email}>
      <IntroDaPagina
        eyebrow="Todos os seus momentos"
        titulo="Meus eventos"
        subtitulo={
          eventos.length === 0
            ? "Crie o primeiro em três minutos: nome, data e identidade. O QR e as placas saem prontos para impressão."
            : "Escolha o evento para abrir o painel dele."
        }
        acao={
          <Link href="/admin/new" className={botaoDoPainel({ variant: "primary" })}>
            <Plus size={16} aria-hidden />
            Criar evento
          </Link>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {eventos.map((e) => {
          const pack = PACKS[e.packId];
          const tipo = pack ? resolvePackText(pack, "evento.nome") : e.packId;
          const nome = slugParaNome(e.slug);
          const fase = faseDoEvento(e, agora);
          const quando = e.comecaEm.toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          return (
            <Link
              key={e.eventoId}
              href={`/admin/e/${e.eventoId}`}
              className="group flex flex-col overflow-hidden rounded-[17px] border border-linha bg-superficie no-underline shadow-suave transition-[transform,border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:-translate-y-0.5 hover:border-acento-borda"
            >
              <div className="flex items-start justify-between gap-3 bg-gradient-chao-quente p-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
                  {tipo}
                </span>
                <span
                  aria-hidden
                  className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-acento font-[family-name:var(--fonte-titulo)] text-sobre-acento"
                >
                  {monograma(nome)}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-5">
                <strong className="font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">
                  {nome}
                </strong>
                <small className="text-[13px] text-ink-2">{quando}</small>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {fase === "durante" && (
                    <Badge tone="accent">
                      <span
                        aria-hidden
                        className="size-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none"
                      />
                      ao vivo
                    </Badge>
                  )}
                  {fase === "antes" && <Badge tone="outline">agendado</Badge>}
                  {fase === "rascunho" && <Badge tone="outline">rascunho</Badge>}
                  {fase === "depois" && <Badge tone="neutral">encerrado</Badge>}
                  <span className="text-[13px] font-semibold text-acento-texto transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] group-hover:translate-x-0.5">
                    Abrir painel →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          href="/admin/new"
          className="grid min-h-[13rem] place-items-center rounded-[17px] border border-dashed border-linha p-5 text-center no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-borda"
        >
          <span>
            <span
              aria-hidden
              className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-acento-fundo text-acento-texto"
            >
              <Plus size={18} />
            </span>
            <strong className="block font-[family-name:var(--fonte-titulo)] text-[1.0625rem] text-ink">
              Um novo motivo para celebrar
            </strong>
            <small className="mt-1 block text-[13px] text-ink-2">Criar novo evento</small>
          </span>
        </Link>
      </div>

      {packSugerido && (
        <Cartao className="mt-6">
          <p className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.0625rem] text-ink">
            {resolvePackText(packSugerido, "sugestao.titulo")}
          </p>
          <p className="m-0 mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
            {resolvePackText(packSugerido, "sugestao.lede")}
          </p>
          <Link
            href="/admin/new"
            className={`${botaoDoPainel({ variant: "light" })} mt-4`}
          >
            {resolvePackText(packSugerido, "sugestao.cta")}
          </Link>
        </Cartao>
      )}

      {eventos.length === 0 && (
        <div className="mt-6">
          <NotaVazia>
            Nenhum evento ainda. O primeiro leva três minutos e já sai com QR pronto.
          </NotaVazia>
        </div>
      )}

      <p className="mt-6 text-[0.8125rem] text-ink-2">
        Cerimonialista ou espaço de festas?{" "}
        <Link href="/admin/vendor/new" className="text-ink-2 underline">
          Crie o portal do fornecedor
        </Link>
        .
      </p>
    </AdminShell>
  );
}
