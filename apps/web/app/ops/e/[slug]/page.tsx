import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { collectEventLiveMetrics, isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { SkipLink } from "@albora/ui-web";
import {
  AdminSection,
  adminClasses,
  adminVars,
} from "@/features/admin/components/server/admin-shell";
import { OpsEventAggregates } from "../../event-aggregates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evento · Ops",
  robots: { index: false, follow: false },
};

/** Só platform_operators — KPIs agregados do Insights do casal; sem thumbs nem nomes. */
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
      <>
      <SkipLink />
      <main
        id="main-content"
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
      </>
    );
  }

  const metrics = await collectEventLiveMetrics(pool, porta.event_id);

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
          <Link href="/ops/events" className="text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75">
            ← Buscar eventos
          </Link>
        </p>
        <h1 className="m-0 font-titulo text-3xl font-light">Evento /{slug}</h1>
        <p className="mt-2 text-ink-2">
          Agregados read-only · sem galeria · sem PII de convidado
          {!porta.active ? " · slug rotacionado, mas ainda resolvível" : ""}.
        </p>
      </header>

      <AdminSection>
        <p className="mb-3 text-sm text-ink-2">Ações disponíveis</p>
        <Link href={`/ops/e/${slug}/painel`} className={adminClasses.primaryButton}>
          Ver painel completo do evento
        </Link>
      </AdminSection>

      <div className="mt-8">
        <OpsEventAggregates slug={slug} metrics={metrics} />
      </div>
    </main>
    </>
  );
}
