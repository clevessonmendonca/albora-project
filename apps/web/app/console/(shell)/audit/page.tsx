import React from "react";
import { redirect } from "next/navigation";
import { listAudit, type AuditTargetKind } from "@albora/application";
import { PageHeader } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";
import { AuditTable } from "@/features/console/components/client/audit-table";

export const dynamic = "force-dynamic";

const ALVOS_VALIDOS: AuditTargetKind[] = ["account", "event", "ticket", "subscription", "staff_user", "platform"];

const UM_DIA_MS = 24 * 60 * 60 * 1000;

/** "período" é sempre relativo a agora, nunca uma data literal na querystring — datas absolutas nos testes e nesta conta são as duas coisas que o brief pede pra nunca fixar. */
function calcularDesde(period: string | undefined): Date | undefined {
  if (period === "24h") return new Date(Date.now() - UM_DIA_MS);
  if (period === "7d") return new Date(Date.now() - 7 * UM_DIA_MS);
  if (period === "30d") return new Date(Date.now() - 30 * UM_DIA_MS);
  return undefined;
}

/**
 * Tela só-leitura por desenho, não por omissão (§8.1.8): `audit_log` é
 * append-only por GRANT — o papel da aplicação não tem UPDATE/DELETE/
 * TRUNCATE na tabela. Nenhum botão de editar, excluir ou "marcar como
 * revisado" chega aqui em nenhuma Onda; se essa vontade aparecer, o estado
 * novo que ela pede é decisão da Onda C, não desta tela.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; target?: string; action?: string; period?: string; cursor?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { actor: actorId, target, action, period, cursor } = await searchParams;
  const desde = calcularDesde(period);

  const { rows, nextCursor } = await listAudit(
    { pool: getPool() },
    {
      actor,
      limit: 50,
      ...(actorId ? { actorId } : {}),
      ...(target && (ALVOS_VALIDOS as string[]).includes(target) ? { targetKind: target as AuditTargetKind } : {}),
      ...(action ? { action } : {}),
      ...(desde ? { since: desde } : {}),
      ...(cursor ? { cursor } : {}),
    },
  );

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Trilha que prova o que a equipe fez — leitura por construção, sem ação. audit_log é append-only."
      />
      <AuditTable rows={rows} nextCursor={nextCursor} />
    </>
  );
}
