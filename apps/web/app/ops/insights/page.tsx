import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformOperator, listOpenSupportTicketsAdmin } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KPIs · Ops",
  robots: { index: false, follow: false },
};

/**
 * Owner: volume e funil de landing — agregados, sem casal identificado.
 */
export default async function OpsInsightsPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops/insights");

  const allowed = await isPlatformOperator(getPool(), host.accountId);
  if (!allowed) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">Sem acesso.</p>
      </main>
    );
  }

  const pool = getPool();
  const [{ rows: product }, tickets, { rows: platformKpis }] = await Promise.all([
    pool.query<{ name: string; n: number }>(
      `SELECT name, count(*)::int AS n FROM product_events
        WHERE created_at > now() - interval '7 days'
        GROUP BY name ORDER BY n DESC`,
    ),
    listOpenSupportTicketsAdmin(pool, host.accountId, 5),
    pool.query<{
      events_with_activity: number;
      total_uploads: number;
      total_product_events: number;
      open_tickets: number;
    }>(
      `SELECT
        (SELECT count(DISTINCT event_id)::int FROM uploads
          WHERE created_at > now() - interval '7 days') AS events_with_activity,
        (SELECT count(*)::int FROM uploads
          WHERE created_at > now() - interval '7 days') AS total_uploads,
        (SELECT count(*)::int FROM product_events
          WHERE created_at > now() - interval '7 days') AS total_product_events,
        (SELECT count(*)::int FROM support_tickets
          WHERE status IN ('open', 'pending')) AS open_tickets`,
    ),
  ]);

  const kpis = platformKpis[0];

  console.log("ops.insights", { accountId: host.accountId });

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="m-0 font-titulo text-3xl font-light">KPIs</h1>
      <p className="mt-2 text-ink-2">
        Agregados da plataforma (7 dias), funil de landing e fila de suporte.
      </p>

      <section className="mt-8">
        <h2 className="font-titulo text-lg">Plataforma (7 dias)</h2>
        <ul className="mt-3 list-none p-0">
          <li className="flex justify-between border-b border-linha py-2 text-sm">
            <span>Eventos com atividade</span>
            <span className="tabular-nums">{kpis?.events_with_activity ?? 0}</span>
          </li>
          <li className="flex justify-between border-b border-linha py-2 text-sm">
            <span>Total de uploads</span>
            <span className="tabular-nums">{kpis?.total_uploads ?? 0}</span>
          </li>
          <li className="flex justify-between border-b border-linha py-2 text-sm">
            <span>Total de product_events</span>
            <span className="tabular-nums">{kpis?.total_product_events ?? 0}</span>
          </li>
          <li className="flex justify-between border-b border-linha py-2 text-sm">
            <span>Tickets de suporte abertos</span>
            <span className="tabular-nums">{kpis?.open_tickets ?? 0}</span>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-titulo text-lg">Landing (7 dias)</h2>
        <ul className="mt-3 list-none p-0">
          {product.map((e) => (
            <li key={e.name} className="flex justify-between border-b border-linha py-2 text-sm">
              <span>{e.name}</span>
              <span className="tabular-nums">{e.n}</span>
            </li>
          ))}
          {product.length === 0 && <li className="text-ink-3">Sem product_events ainda.</li>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-titulo text-lg">Suporte aberto (amostra)</h2>
        <ul className="mt-3 list-none p-0">
          {tickets.map((t) => (
            <li key={t.id} className="border-b border-linha py-2 text-sm">
              {t.priority.toUpperCase()} · {t.subject}
            </li>
          ))}
          {tickets.length === 0 && <li className="text-ink-3">Fila vazia.</li>}
        </ul>
      </section>
    </main>
  );
}
