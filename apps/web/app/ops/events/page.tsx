import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collectEventLiveMetrics, isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { OpsEventAggregates } from "../event-aggregates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lookup · Ops",
  robots: { index: false, follow: false },
};

/**
 * Lookup read-only por ?slug= — só platform_operators.
 * Mesmos KPIs do Insights do casal; sem thumbs nem nomes.
 */
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
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">Sem acesso.</p>
      </main>
    );
  }

  const { slug: raw } = await searchParams;
  const slug = (raw ?? "").trim().toLowerCase();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="m-0">
        <Link href="/ops" className="text-acento underline">
          ← Ops
        </Link>
      </p>
      <h1 className="mt-6 font-titulo text-3xl font-light">Lookup de evento</h1>
      <p className="mt-2 text-ink-2">
        H1, funil e vias — agregados. Sem nomes, sem thumbs. Auditoria no log.
      </p>

      <form method="get" action="/ops/events" className="mt-8 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="slug">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={slug}
          placeholder="slug-do-evento"
          autoComplete="off"
          className="min-w-[12rem] flex-1 rounded-token border border-linha bg-bg px-3 py-2 font-titulo text-ink"
        />
        <button
          type="submit"
          className="rounded-token bg-acento px-4 py-2 font-titulo text-acento-texto"
        >
          Abrir
        </button>
      </form>

      {slug ? (
        <div className="mt-10">
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
    return <p className="m-0 text-ink-2">Slug desconhecido.</p>;
  }

  const metrics = await collectEventLiveMetrics(pool, porta.event_id);

  return (
    <>
      <p className="mb-6 mt-0 text-sm text-ink-3">
        Também em{" "}
        <Link href={`/ops/e/${encodeURIComponent(slug)}`} className="text-acento underline">
          /ops/e/{slug}
        </Link>
        {!porta.active ? " · slug rotacionado" : ""}.
      </p>
      <OpsEventAggregates slug={slug} metrics={metrics} />
    </>
  );
}
