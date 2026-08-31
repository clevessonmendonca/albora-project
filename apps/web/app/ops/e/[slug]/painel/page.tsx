import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  collectEventLiveMetrics,
  isPlatformOperator,
  listSupportTicketsForEvent,
} from "@albora/db";
import { parsePlanoDoEvento } from "@albora/core";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import {
  AdminSection,
  adminVars,
} from "@/features/admin/components/server/admin-shell";
import { OpsEventAggregates } from "../../../event-aggregates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Painel do Evento · Ops",
  robots: { index: false, follow: false },
};

type EventDetails = {
  eventId: string;
  title: string | null;
  slug: string;
  plan: string;
  accountId: string;
  startsAt: Date;
  endsAt: Date;
};

export default async function OpsPainelEventoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops");

  const allowed = await isPlatformOperator(getPool(), host.accountId);
  if (!allowed) {
    return (
      <main
        className="mx-auto min-h-dvh max-w-lg bg-bg px-6 py-16 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">Sem acesso.</p>
      </main>
    );
  }

  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw).trim().toLowerCase();
  const motivo = "ops.read_event_panel";

  console.log("ops.event_panel", { accountId: host.accountId, slug, motivo });

  const pool = getPool();
  const { rows: slugs } = await pool.query<{ event_id: string; active: boolean }>(
    `SELECT event_id, active FROM event_slugs WHERE slug = $1`,
    [slug],
  );
  const porta = slugs[0];

  if (!porta) {
    return (
      <main
        className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <header className="mb-8">
          <p className="m-0 mb-6">
            <Link href="/ops/events" className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
              ← Buscar eventos
            </Link>
          </p>
          <h1 className="m-0 font-titulo text-3xl font-light">/{slug}</h1>
          <p className="mt-2 text-ink-2">
            Nenhum evento encontrado com este slug. Verifique a grafia ou tente outro.
          </p>
        </header>
      </main>
    );
  }

  const [eventDetails, metrics, membersCount, tickets] = await Promise.all([
    pool
      .query<{
        id: string;
        title: string | null;
        slug: string;
        plan: string;
        account_id: string;
        starts_at: Date;
        ends_at: Date;
      }>(
        `SELECT id, title, slug, plan, account_id, starts_at, ends_at
         FROM events
         WHERE id = $1`,
        [porta.event_id],
      )
      .then((res) => {
        const row = res.rows[0];
        if (!row) return null;
        return {
          eventId: row.id,
          title: row.title,
          slug: row.slug,
          plan: row.plan,
          accountId: row.account_id,
          startsAt: row.starts_at,
          endsAt: row.ends_at,
        } as EventDetails;
      }),
    collectEventLiveMetrics(pool, porta.event_id),
    pool
      .query<{ count: string }>(
        `SELECT COUNT(*) as count FROM event_members WHERE event_id = $1`,
        [porta.event_id],
      )
      .then((res) => parseInt(res.rows[0]?.count ?? "0", 10)),
    listSupportTicketsForEvent(pool, host.accountId, porta.event_id),
  ]);

  if (!eventDetails) {
    return (
      <main
        className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <header className="mb-8">
          <p className="m-0 mb-6">
            <Link href={`/ops/e/${slug}`} className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
              ← Voltar
            </Link>
          </p>
          <h1 className="m-0 font-titulo text-3xl font-light">Evento não encontrado</h1>
          <p className="mt-2 text-ink-2">Os dados deste evento não estão disponíveis.</p>
        </header>
      </main>
    );
  }

  const planName = parsePlanoDoEvento(eventDetails.plan);
  const guestUrl = `https://albora.com.br/e/${eventDetails.slug}`;

  return (
    <main
      className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-8">
        <p className="m-0 mb-6">
          <Link href={`/ops/e/${slug}`} className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
            ← Voltar
          </Link>
        </p>
        <h1 className="m-0 font-titulo text-3xl font-light">
          {eventDetails.title || "Evento sem título"}
        </h1>
        <p className="mt-2 text-ink-2">
          Painel read-only · sem galeria · sem escrita
          {!porta.active ? " · slug rotacionado, mas ainda resolvível" : ""}
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Detalhes do Evento</h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-sm md:grid-cols-[auto_1fr]">
            <dt className="text-ink-3">Slug</dt>
            <dd className="m-0 font-mono text-ink">/{eventDetails.slug}</dd>

            <dt className="text-ink-3">Plano</dt>
            <dd className="m-0 text-ink">{planName}</dd>

            <dt className="text-ink-3">URL do convidado</dt>
            <dd className="m-0">
              <a
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-acento underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75"
              >
                {guestUrl}
              </a>
            </dd>

            <dt className="text-ink-3">Account ID</dt>
            <dd className="m-0 font-mono text-xs text-ink-2">{eventDetails.accountId}</dd>

            <dt className="text-ink-3">Event ID</dt>
            <dd className="m-0 font-mono text-xs text-ink-2">{eventDetails.eventId}</dd>

            <dt className="text-ink-3">Início</dt>
            <dd className="m-0 text-ink">
              {eventDetails.startsAt.toLocaleDateString("pt-BR", {
                dateStyle: "long",
              })}
            </dd>

            <dt className="text-ink-3">Término</dt>
            <dd className="m-0 text-ink">
              {eventDetails.endsAt.toLocaleDateString("pt-BR", {
                dateStyle: "long",
              })}
            </dd>
          </dl>
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-3 font-titulo text-xl">Equipe</h2>
          <p className="m-0 text-sm text-ink-2">
            {membersCount === 0
              ? "Nenhum membro adicional no evento"
              : membersCount === 1
                ? "1 membro adicional além do dono"
                : `${membersCount} membros adicionais além do dono`}
          </p>
        </AdminSection>

        {tickets.length > 0 && (
          <AdminSection>
            <h2 className="m-0 mb-4 font-titulo text-xl">Tickets de Suporte</h2>
            <ul className="list-none space-y-3 p-0">
              {tickets.map((ticket) => {
                const isUrgent = ticket.priority === "p0";
                const isHigh = ticket.priority === "p1";

                return (
                  <li
                    key={ticket.id}
                    className="rounded-token border border-linha bg-superficie-alta p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="m-0 text-sm text-ink">{ticket.subject}</p>
                        <p className="mb-0 mt-1 text-xs text-ink-3">
                          {ticket.createdAt.toLocaleDateString("pt-BR", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-block rounded-token px-2 py-1 font-titulo text-xs uppercase tracking-rotulo ${
                            isUrgent
                              ? "bg-critico text-sobre-acento"
                              : isHigh
                                ? "bg-alerta text-ink"
                                : "bg-superficie text-ink-2"
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="inline-block rounded-token bg-superficie px-2 py-1 font-titulo text-xs uppercase tracking-rotulo text-ink-2">
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </AdminSection>
        )}

        <div>
          <h2 className="mb-6 font-titulo text-2xl font-light">Métricas ao Vivo</h2>
          <OpsEventAggregates slug={eventDetails.slug} metrics={metrics} />
        </div>
      </div>
    </main>
  );
}
