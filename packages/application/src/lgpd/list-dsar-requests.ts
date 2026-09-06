import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listDsarRequestsAdmin, type DsarRequestRow, type DsarStatus } from "@albora/db";
import { executeQuery } from "../envelope/query";

/** Reexportado — a rota (`apps/web/app/console/...`) nunca importa `@albora/db` direto (guard `camadas`, ADR 0016). */
export type { DsarKind, DsarRequestRow, DsarStatus } from "@albora/db";

export type ListDsarRequestsInput = { actor: Actor; statuses?: DsarStatus[]; limit: number };

/** `dsar_requests` não tem RLS (tabela de plataforma) — leitura direta no pool comum, sem `withPlatformAggregation`. Ordenado no banco por prazo legal mais próximo primeiro. */
export async function listDsarRequests(deps: { pool: Pool }, input: ListDsarRequestsInput): Promise<{ rows: DsarRequestRow[] }> {
  return executeQuery(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.read",
    run: () => listDsarRequestsAdmin(deps.pool, { ...(input.statuses ? { statuses: input.statuses } : {}), limit: input.limit }),
  });
}
