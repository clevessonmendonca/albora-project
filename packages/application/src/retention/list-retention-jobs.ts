import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listRetentionJobsAdmin, type RetentionJobAdminRow } from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

/** Reexportado — a rota (`apps/web/app/console/...`) nunca importa `@albora/db` direto (guard `camadas`, ADR 0016). */
export type { RetentionJobAdminRow } from "@albora/db";

export type ListRetentionJobsInput = { actor: Actor; reason: string; status?: string; limit: number };

const MAX_ERROR_CHARS = 160;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;

/**
 * `last_error` chega de `String(e)` em `processRetentionJob` — texto bruto
 * de exceção do driver, não uma mensagem desenhada para tela. Um erro de
 * constraint do Postgres pode ecoar o VALOR da coluna que violou a
 * constraint, não só o nome dela; nunca assumimos que "é mensagem técnica"
 * quer dizer "não carrega PII". Mascara padrão de e-mail/telefone e corta
 * o tamanho antes de qualquer coisa chegar à tela do console.
 */
export function sanitizeRetentionError(raw: string | null): string | null {
  if (!raw) return null;
  const semEmail = raw.replace(EMAIL_RE, "[e-mail]");
  const semTelefone = semEmail.replace(PHONE_RE, "[telefone]");
  return semTelefone.length > MAX_ERROR_CHARS ? `${semTelefone.slice(0, MAX_ERROR_CHARS)}…` : semTelefone;
}

/**
 * Único caso de uso da tela Retenção (§10.3) — leitura cross-evento sob
 * `withPlatformAggregation`. Só leitura: reprocessar um job falhado é ação,
 * chega na Onda C com `executeCommand` e auditoria. Nenhuma mutação aqui.
 */
export async function listRetentionJobs(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: ListRetentionJobsInput,
): Promise<{ rows: RetentionJobAdminRow[]; nextCursor: null }> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "retention.read",
    reason: input.reason,
    action: "retention.list.read",
    run: async () => {
      const { rows } = await listRetentionJobsAdmin(deps.aggregatorPool, {
        ...(input.status ? { status: input.status } : {}),
        limit: input.limit,
      });
      return {
        rows: rows.map((r) => ({ ...r, lastError: sanitizeRetentionError(r.lastError) })),
        nextCursor: null,
      };
    },
  });
}
