import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listAuditLog, type AuditLogFilter, type AuditRow } from "@albora/db";
import { executeQuery } from "../envelope/query";

/** Reexportados — a rota (`apps/web/app/console/...`) nunca importa `@albora/db` direto (guard `camadas`, ADR 0016). */
export type { AuditRow, AuditTargetKind } from "@albora/db";

export type ListAuditInput = AuditLogFilter & { actor: Actor };

/**
 * Único caso de uso da tela Auditoria (§8.1.8). `audit_log` não tem RLS
 * (migration 0060, tabela cross-evento por natureza) — `executeQuery` puro,
 * sem `withPlatformAggregation`, que é para leitura cross-evento em cima do
 * pool de tenant (nota de reconhecimento 5).
 *
 * Só leitura, e só pode ser: o papel `albora_app` tem `UPDATE`/`DELETE`/
 * `TRUNCATE` revogados em `audit_log` por GRANT — uma trilha que se edita
 * não é trilha. Nenhuma mutação chega aqui em nenhuma Onda.
 */
export async function listAudit(
  deps: { pool: Pool },
  input: ListAuditInput,
): Promise<{ rows: AuditRow[]; nextCursor: string | null }> {
  const { actor, ...filter } = input;
  return executeQuery(deps, {
    actor,
    capability: "audit.read",
    run: () => listAuditLog(deps.pool, filter),
  });
}
