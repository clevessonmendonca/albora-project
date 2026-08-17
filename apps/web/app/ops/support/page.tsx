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
  title: "Suporte · Ops",
  robots: { index: false, follow: false },
};

/**
 * Inbox da equipe owner. Best practice: fila por prioridade/SLA, sem galeria.
 */
export default async function OpsSupportPage() {
  const token = (await cookies()).get(HOST_COOKIE)?.value;
  const host = await hostFromToken(token);
  if (!host) redirect("/admin/sign-in?next=/ops/support");

  const allowed = await isPlatformOperator(getPool(), host.accountId);
  if (!allowed) {
    return (
      <main
        className="mx-auto min-h-dvh max-w-lg bg-bg px-6 py-16 font-[family-name:var(--fonte-corpo)] text-ink"
        style={adminVars()}
      >
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">
          Esta área é só da equipe Albora. Peça para alguém te colocar em{" "}
          <code className="rounded bg-superficie px-1.5 py-0.5 font-mono text-sm">
            platform_operators
          </code>
          .
        </p>
      </main>
    );
  }

  console.log("ops.support.page", { accountId: host.accountId });
  const tickets = await listOpenSupportTicketsAdmin(getPool(), host.accountId);

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
        <h1 className="m-0 font-titulo text-3xl font-light">Inbox de Suporte</h1>
        <p className="mt-2 text-ink-2">
          P0 festa ao vivo ≤15 min · P1 pré-festa ≤4h · P2 ≤1 dia útil. Sem fotos de convidado
          nesta fila.
        </p>
      </header>

      {tickets.length === 0 ? (
        <AdminSection>
          <p className="m-0 text-sm text-ink-3">
            Nenhum ticket aberto no momento. Fila vazia — tudo sob controle.
          </p>
        </AdminSection>
      ) : (
        <div className="flex flex-col gap-4">
          {tickets.map((t) => {
            const isUrgent = t.priority === "p0";
            const isHigh = t.priority === "p1";

            return (
              <AdminSection key={t.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="m-0 font-titulo text-lg">{t.subject}</h2>
                    <p className="mb-0 mt-2 text-sm text-ink-3">
                      Aberto em {t.createdAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      {t.slaDueAt
                        ? ` · SLA até ${t.slaDueAt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`inline-block rounded-token px-3 py-1.5 font-titulo text-xs uppercase tracking-rotulo ${
                        isUrgent
                          ? "bg-critico text-sobre-acento"
                          : isHigh
                            ? "bg-alerta text-ink"
                            : "bg-superficie-alta text-ink-2"
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="inline-block rounded-token bg-superficie-alta px-3 py-1.5 font-titulo text-xs uppercase tracking-rotulo text-ink-2">
                      {t.status}
                    </span>
                  </div>
                </div>
              </AdminSection>
            );
          })}
        </div>
      )}
    </main>
  );
}
