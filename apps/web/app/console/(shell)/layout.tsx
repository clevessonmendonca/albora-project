import React, { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { hasCapability } from "@albora/core";
import { getActiveImpersonationForStaff, listPendingImpersonationRequests } from "@albora/application";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";
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
