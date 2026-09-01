import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isPlatformOperator } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";
import { SkipLink } from "@albora/ui-web";
import {
  AdminSection,
  adminClasses,
  adminVars,
} from "@/features/admin/components/server/admin-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ops · Albora",
  robots: { index: false, follow: false },
};

export default async function OpsHomePage() {
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
        <p className="mt-3 text-ink-2">Só da equipe Albora.</p>
      </main>
      </>
    );
  }

  return (
    <>
    <SkipLink />
    <main
      id="main-content"
      className="mx-auto min-h-dvh max-w-4xl bg-bg px-6 py-12 font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-10">
        <h1 className="m-0 font-titulo text-3xl font-light">Console de Operações</h1>
        <p className="mt-2 text-ink-2">
          Visão da plataforma, suporte e eventos — agregados, sem PII de convidado.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AdminSection>
          <h2 className="m-0 mb-3 font-titulo text-xl">Suporte</h2>
          <p className="mb-5 text-sm text-ink-2">
            Fila de tickets abertos, prioridades e SLAs da equipe.
          </p>
          <Link href="/ops/support" className={adminClasses.primaryButton}>
            Abrir inbox
          </Link>
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-3 font-titulo text-xl">Insights</h2>
          <p className="mb-5 text-sm text-ink-2">
            KPIs agregados da plataforma, funil de landing e volume de eventos.
          </p>
          <Link href="/ops/insights" className={adminClasses.primaryButton}>
            Ver métricas
          </Link>
        </AdminSection>

        <AdminSection>
          <h2 className="m-0 mb-3 font-titulo text-xl">Eventos</h2>
          <p className="mb-5 text-sm text-ink-2">
            Busca por slug, métricas ao vivo e painel read-only de cada evento.
          </p>
          <Link href="/ops/events" className={adminClasses.primaryButton}>
            Buscar evento
          </Link>
        </AdminSection>
      </div>
    </main>
    </>
  );
}
