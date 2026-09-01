import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  collectPlatformLiveMetrics,
  isPlatformOperator,
  listOpenSupportTicketsAdmin,
  PLATFORM_SNAPSHOT_SCOPE_ID,
  readAnalyticsSnapshot,
  type PlatformLiveMetrics,
} from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { parsePlatformLiveMetrics } from "@/lib/platform-metrics";
import { SkipLink } from "@albora/ui-web";
import {
  AdminSection,
  adminVars,
} from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "KPIs · Ops",
  robots: { index: false, follow: false },
};

async function carregarKpisPlatform(): Promise<{
  metrics: PlatformLiveMetrics;
  fonte: "snapshot" | "live";
  computedAt: Date | null;
}> {
  const pool = getPool();
  const snap = await readAnalyticsSnapshot(pool, "platform", PLATFORM_SNAPSHOT_SCOPE_ID, "live");
  const parsed = snap ? parsePlatformLiveMetrics(snap.metrics) : null;
  if (parsed) {
    return { metrics: parsed, fonte: "snapshot", computedAt: snap!.computedAt };
  }
  const live = await collectPlatformLiveMetrics(pool);
  return { metrics: live, fonte: "live", computedAt: null };
}

/** Agregados sem casal identificado — prefere `analytics_snapshots`; cai na query live se o job ainda não rodou. */
export default async function OpsInsightsPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops/insights");

  const allowed = await isPlatformOperator(getPool(), host.accountId);
  if (!allowed) {
    return (
      <>
      <SkipLink />
      <main
        id="main-content"
        className="mx-auto min-h-dvh max-w-lg bg-bg px-6 py-16 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">Sem acesso.</p>
      </main>
      </>
    );
  }

  const pool = getPool();
  const [{ metrics: kpis, fonte, computedAt }, tickets] = await Promise.all([
    carregarKpisPlatform(),
    listOpenSupportTicketsAdmin(pool, host.accountId, 5),
  ]);

  const product = Object.entries(kpis.productEventsByName)
    .map(([name, n]) => ({ name, n }))
    .sort((a, b) => b.n - a.n);

  console.log("ops.insights", { accountId: host.accountId, fonte });

  const stamp =
    fonte === "snapshot" && computedAt
      ? `Snapshot · ${computedAt.toLocaleString("pt-BR")}`
      : "Ao vivo (job ainda não materializou)";

  return (
    <>
    <SkipLink />
    <main
      id="main-content"
      className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-8">
        <p className="m-0 mb-6">
          <Link href="/ops" className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
            ← Console
          </Link>
        </p>
        <h1 className="m-0 font-titulo text-3xl font-light">Insights da Plataforma</h1>
        <p className="mt-2 text-ink-2">
          Agregados dos últimos {kpis.windowDays} dias — funil de landing, volume de eventos e
          fila de suporte.
        </p>
        <p className="mt-1 text-xs text-ink-3">{stamp}</p>
      </header>

      <div className="flex flex-col gap-6">
        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Atividade da Plataforma</h2>
          <ul className="list-none p-0">
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Eventos com atividade</span>
              <span className="font-titulo tabular-nums text-ink">{kpis.eventsWithActivity}</span>
            </li>
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Total de uploads</span>
              <span className="font-titulo tabular-nums text-ink">{kpis.totalUploads}</span>
            </li>
            <li className="flex justify-between border-b border-linha py-3 text-sm">
              <span className="text-ink-2">Eventos de produto</span>
              <span className="font-titulo tabular-nums text-ink">{kpis.totalProductEvents}</span>
            </li>
            <li className="flex justify-between py-3 text-sm">
              <span className="text-ink-2">Tickets abertos</span>
              <span className="font-titulo tabular-nums text-ink">{kpis.openTickets}</span>
            </li>
          </ul>
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-4 font-titulo text-xl">Funil de Landing</h2>
          {product.length === 0 ? (
            <p className="m-0 text-sm text-ink-3">
              Nenhum evento de produto registrado nos últimos {kpis.windowDays} dias.
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
    </>
  );
}
