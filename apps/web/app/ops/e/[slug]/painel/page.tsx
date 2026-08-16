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
      <main className="mx-auto max-w-lg px-6 py-16">
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
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="m-0">
          <Link href="/ops/events" className="text-acento underline">
            ← Lookup
          </Link>
        </p>
        <h1 className="mt-6 font-titulo text-3xl font-light">/{slug}</h1>
        <p className="mt-3 text-ink-2">Slug desconhecido.</p>
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
      <main className="mx-auto max-w-2xl px-6 py-12">
        <p className="m-0">
          <Link href={`/ops/e/${slug}`} className="text-acento underline">
            ← Voltar
          </Link>
        </p>
        <h1 className="mt-6 font-titulo text-3xl font-light">Evento não encontrado</h1>
      </main>
    );
  }

  const planName = parsePlanoDoEvento(eventDetails.plan);
  const guestUrl = `https://albora.com.br/e/${eventDetails.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="m-0">
        <Link href={`/ops/e/${slug}`} className="text-acento underline">
          ← Voltar
        </Link>
      </p>

      <h1 className="mt-6 font-titulo text-3xl font-light">
        {eventDetails.title || "Evento sem título"}
      </h1>
      <p className="mt-2 text-ink-2">
        Painel read-only · sem galeria · sem escrita
        {!porta.active ? " · slug rotacionado (ainda resolve)" : ""}
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <section className="rounded-token bg-superficie-alta p-5">
          <h2 className="m-0 font-titulo text-xl">Detalhes do Evento</h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
            <dt className="text-ink-3">Slug:</dt>
            <dd className="m-0 font-mono">/{eventDetails.slug}</dd>

            <dt className="text-ink-3">Plano:</dt>
            <dd className="m-0">{planName}</dd>

            <dt className="text-ink-3">URL do convidado:</dt>
            <dd className="m-0">
              <a
                href={guestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-acento underline"
              >
                {guestUrl}
              </a>
            </dd>

            <dt className="text-ink-3">Account ID:</dt>
            <dd className="m-0 font-mono text-xs">{eventDetails.accountId}</dd>

            <dt className="text-ink-3">Event ID:</dt>
            <dd className="m-0 font-mono text-xs">{eventDetails.eventId}</dd>

            <dt className="text-ink-3">Início:</dt>
            <dd className="m-0">{eventDetails.startsAt.toLocaleDateString("pt-BR")}</dd>

            <dt className="text-ink-3">Término:</dt>
            <dd className="m-0">{eventDetails.endsAt.toLocaleDateString("pt-BR")}</dd>
          </dl>
        </section>

        <section className="rounded-token bg-superficie-alta p-5">
          <h2 className="m-0 font-titulo text-xl">Equipe</h2>
          <p className="mt-2 text-sm text-ink-2">
            {membersCount === 0
              ? "Nenhum membro adicional"
              : membersCount === 1
                ? "1 membro adicional"
                : `${membersCount} membros adicionais`}
          </p>
        </section>

        {tickets.length > 0 && (
          <section className="rounded-token bg-superficie-alta p-5">
            <h2 className="m-0 font-titulo text-xl">Tickets de Suporte</h2>
            <ul className="mt-3 list-none space-y-2 p-0">
              {tickets.map((ticket) => (
                <li
                  key={ticket.id}
                  className="flex items-start justify-between border-b border-linha pb-2"
                >
                  <div>
                    <p className="m-0 text-sm">{ticket.subject}</p>
                    <p className="mb-0 mt-1 text-xs text-ink-3">
                      {ticket.status} · {ticket.priority.toUpperCase()} ·{" "}
                      {ticket.createdAt.toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-4 font-titulo text-xl">Métricas ao Vivo</h2>
          <OpsEventAggregates slug={eventDetails.slug} metrics={metrics} />
        </section>
      </div>
    </main>
  );
}
