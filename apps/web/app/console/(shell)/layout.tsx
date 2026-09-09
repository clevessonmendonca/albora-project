import React, { type ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasCapability } from "@albora/core";
import { getActiveImpersonationForStaff, listPendingImpersonationRequests } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";
import { CHAVE_SIDEBAR } from "@/features/console/components/client/console-frame";
import { ConsolePeriodo } from "@/features/console/components/client/console-periodo";
import { ConsoleShell } from "@/features/console/components/server/console-shell";

/**
 * Busca a impersonação ativa do ator (banner, T10) e, só para quem tem
 * `impersonate.approve`, os pedidos pendentes da plataforma inteira (barra
 * de contexto) — `support` nunca dispara essa segunda query, porque nunca
 * teria o que fazer com o resultado.
 */
export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const jarra = await cookies();
  const recolhidaInicial = jarra.get(CHAVE_SIDEBAR)?.value === "recolhida";

  const pool = getPool();
  const podeAprovar = hasCapability(actor.roles, "impersonate.approve");

  const [impersonacaoAtiva, pedidosPendentes] = await Promise.all([
    getActiveImpersonationForStaff(pool, actor.staffUserId),
    podeAprovar ? listPendingImpersonationRequests({ pool }, { actor }) : Promise.resolve([]),
  ]);

  return (
    <ConsoleShell
      actor={actor}
      periodo={<ConsolePeriodo />}
      recolhidaInicial={recolhidaInicial}
      activeImpersonation={
        impersonacaoAtiva
          ? {
              id: impersonacaoAtiva.id,
              targetAccountId: impersonacaoAtiva.targetAccountId,
              expiresAt: impersonacaoAtiva.expiresAt!,
            }
          : null
      }
      pendingImpersonationRequests={pedidosPendentes.map((r) => ({
        id: r.id,
        requesterStaffId: r.requesterStaffId,
        targetAccountId: r.targetAccountId,
        reason: r.reason,
        createdAt: r.createdAt,
      }))}
    >
      {children}
    </ConsoleShell>
  );
}
