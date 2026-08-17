import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformOperator, listOpenSupportTicketsAdmin } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import {
  AdminSection,
  adminVars,
} from "@/features/admin/components/server/admin-shell";

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
      <main
        className="mx-auto min-h-dvh max-w-lg bg-bg px-6 py-16 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
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
    <main
      className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-8">
        <p className="m-0 mb-6">
          <Link href="/ops" className="text-acento no-underline">
            ← Console
          </Link>
        </p>
        <h1 className="m-0 font-titulo text-3xl font-light">Insights da Plataforma</h1>
        <p className="mt-2 text-ink-2">
          Agregados dos últimos 7 dias — funil de landing, volume de eventos e fila de suporte.
        </p>
      </header>

      <div className="flex flex-col gap-6">
        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Atividade da Plataforma</h2>
          <ul className="list-none p-0">
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Eventos com atividade</span>
              <span className="font-titulo tabular-nums text-ink">
                {kpis?.events_with_activity ?? 0}
              </span>
            </li>
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Total de uploads</span>
              <span className="font-titulo tabular-nums text-ink">
                {kpis?.total_uploads ?? 0}
              </span>
            </li>
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Eventos de produto</span>
              <span className="font-titulo tabular-nums text-ink">
                {kpis?.total_product_events ?? 0}
              </span>
            </li>
            <li className="flex justify-between py-3 text-sm">
              <span className="text-ink-2">Tickets abertos</span>
              <span className="font-titulo tabular-nums text-ink">{kpis?.open_tickets ?? 0}</span>
            </li>
          </ul>
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Funil de Landing</h2>
          {product.length === 0 ? (
            <p className="m-0 text-sm text-ink-3">
              Nenhum evento de produto registrado nos últimos 7 dias.
            </p>
          ) : (
            <ul className="list-none p-0">
              {product.map((e) => (
                <li
                  key={e.name}
                  className="flex justify-between border-b border-linha py-3 text-sm last:border-b-0"
                >
                  <span className="text-ink-2">{e.name}</span>
                  <span className="font-titulo tabular-nums text-ink">{e.n}</span>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Fila de Suporte (amostra)</h2>
          {tickets.length === 0 ? (
            <p className="m-0 text-sm text-ink-3">Nenhum ticket aberto no momento.</p>
          ) : (
            <ul className="list-none space-y-3 p-0">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className="rounded-token border border-linha bg-superficie-alta px-4 py-3"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="inline-block rounded-token bg-superficie px-2 py-1 font-titulo text-xs uppercase tracking-rotulo text-ink-2">
                      {t.priority}
                    </span>
                    <span className="text-sm text-ink">{t.subject}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AdminSection>
      </div>
    </main>
  );
}
