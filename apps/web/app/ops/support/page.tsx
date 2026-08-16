import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPlatformOperator, listOpenSupportTicketsAdmin } from "@albora/db";
import { HOST_COOKIE, hostFromToken } from "@/lib/host-session";
import { getPool } from "@/lib/db";

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
      <main className="mx-auto max-w-lg px-6 py-16">
        <h1 className="font-titulo text-2xl">Ops</h1>
        <p className="mt-3 text-ink-2">
          Esta área é só da equipe Albora. Peça para alguém te colocar em{" "}
          <code>platform_operators</code>.
        </p>
      </main>
    );
  }

  console.log("ops.support.page", { accountId: host.accountId });
  const tickets = await listOpenSupportTicketsAdmin(getPool(), host.accountId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="m-0 font-titulo text-3xl font-light">Suporte</h1>
      <p className="mt-2 text-ink-2">
        P0 festa ao vivo ≤15 min · P1 pré-festa ≤4h · P2 ≤1 dia útil. Sem fotos de
        convidado nesta fila.
      </p>

      {tickets.length === 0 ? (
        <p className="mt-10 text-ink-3">Nenhum ticket aberto.</p>
      ) : (
        <ul className="mt-8 flex list-none flex-col gap-3 p-0">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="rounded-token border border-linha bg-superficie px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-titulo text-lg">{t.subject}</span>
                <span className="text-xs uppercase tracking-rotulo text-ink-3">
                  {t.priority} · {t.status}
                </span>
              </div>
              <p className="mb-0 mt-2 text-sm text-ink-3">
                aberto {t.createdAt.toLocaleString("pt-BR")}
                {t.slaDueAt ? ` · SLA até ${t.slaDueAt.toLocaleString("pt-BR")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
