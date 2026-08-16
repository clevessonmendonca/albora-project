import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collectEventLiveMetrics, isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { OpsEventAggregates } from "../../event-aggregates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evento · Ops",
  robots: { index: false, follow: false },
};

/**
 * Lookup read-only por slug — só platform_operators.
 * Mesmos KPIs agregados do Insights do casal; sem thumbs nem nomes.
 */
export default async function OpsEventBySlugPage({
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
  const motivo = "ops.read_event_aggregates";

  console.log("ops.event_lookup", { accountId: host.accountId, slug, motivo });

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

  const metrics = await collectEventLiveMetrics(pool, porta.event_id);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="m-0">
        <Link href="/ops/events" className="text-acento underline">
          ← Lookup
        </Link>
      </p>
      <h1 className="mt-6 font-titulo text-3xl font-light">Evento</h1>
      <p className="mt-2 text-ink-2">
        Agregados read-only · sem galeria · sem PII de convidado
        {!porta.active ? " · slug rotacionado (ainda resolve)" : ""}.
      </p>
      <div className="mt-8">
        <OpsEventAggregates slug={slug} metrics={metrics} />
      </div>
    </main>
  );
}
