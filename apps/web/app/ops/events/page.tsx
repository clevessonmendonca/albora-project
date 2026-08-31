import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collectEventLiveMetrics, isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import {
  AdminSection,
  adminClasses,
  adminVars,
} from "@/features/admin/components/server/admin-shell";
import { OpsEventAggregates } from "../event-aggregates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lookup · Ops",
  robots: { index: false, follow: false },
};

/** Só platform_operators — KPIs agregados do Insights do casal; sem thumbs nem nomes. */
export default async function OpsEventsLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops/events");

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

  const { slug: raw } = await searchParams;
  const slug = (raw ?? "").trim().toLowerCase();

  return (
    <main
      className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-8">
        <p className="m-0 mb-6">
          <Link href="/ops" className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
            ← Console
          </Link>
        </p>
        <h1 className="m-0 font-titulo text-3xl font-light">Buscar Evento</h1>
        <p className="mt-2 text-ink-2">
          Agregados H1, funil e vias — sem nomes, sem thumbs. Auditoria registrada no log.
        </p>
      </header>

      <AdminSection>
        <form method="get" action="/ops/events" className="flex flex-wrap gap-3">
          <div className="flex-1">
            <label htmlFor="slug" className="mb-2 block text-sm text-ink-2">
              Slug do evento
            </label>
            <input
              id="slug"
              name="slug"
              type="text"
              defaultValue={slug}
              placeholder="meu-evento-especial"
              autoComplete="off"
              className="w-full rounded-token border border-linha bg-bg px-4 py-3 font-titulo text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
            />
          </div>
          <div className="flex items-end">
            <button type="submit" className={adminClasses.primaryButton}>
              Buscar
            </button>
          </div>
        </form>
      </AdminSection>

      {slug ? (
        <div className="mt-8">
          <OpsEventLookupResult accountId={host.accountId} slug={slug} />
        </div>
      ) : null}
    </main>
  );
}

async function OpsEventLookupResult({
  accountId,
  slug,
}: {
  accountId: string;
  slug: string;
}) {
  const motivo = "ops.read_event_aggregates";
  console.log("ops.event_lookup", { accountId, slug, motivo });

  const pool = getPool();
  const { rows: slugs } = await pool.query<{ event_id: string; active: boolean }>(
    `SELECT event_id, active FROM event_slugs WHERE slug = $1`,
    [slug],
  );
  const porta = slugs[0];
  if (!porta) {
    return (
      <AdminSection>
        <p className="m-0 text-sm text-ink-2">
          Nenhum evento encontrado com o slug{" "}
          <span className="font-titulo text-ink">/{slug}</span>. Verifique a grafia ou tente
          outro slug.
        </p>
      </AdminSection>
    );
  }

  const metrics = await collectEventLiveMetrics(pool, porta.event_id);

  return (
    <>
      <p className="mb-6 mt-0 text-sm text-ink-3">
        Também disponível em{" "}
        <Link href={`/ops/e/${encodeURIComponent(slug)}`} className="text-acento underline">
          /ops/e/{slug}
        </Link>
        {!porta.active ? " · slug rotacionado, mas ainda resolvível" : ""}.
      </p>
      <OpsEventAggregates slug={slug} metrics={metrics} />
    </>
  );
}
