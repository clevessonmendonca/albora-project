import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listSecurityEvents, type SecurityEventFilter, type SecurityEventKind, type SecurityEventRow } from "@albora/db";
import { executeQuery } from "../envelope/query";

/** Reexportados — a rota (`apps/web/app/console/...`) nunca importa `@albora/db` direto (guard `camadas`, ADR 0016). */
export type { SecurityEventKind, SecurityEventRow } from "@albora/db";

export type ListSecurityInput = SecurityEventFilter & { actor: Actor };

/**
 * Único caso de uso da tela Segurança (§8.1.8). `security_events` não tem
 * RLS (mesma razão de `listAudit`, T9) — `executeQuery` puro, sem
 * `withPlatformAggregation`.
 *
 * Diferença de `audit_log`: esta tabela é a que *avisa*, não a que *prova* —
 * alto volume, escrita assíncrona que nunca derruba a operação
 * (`insertSecurityEvent` engole a própria falha). Leitura aqui é só leitura,
 * e só pode ser: nenhuma mutação chega nesta tela em nenhuma Onda.
 */
export async function listSecurity(
  deps: { pool: Pool },
  input: ListSecurityInput,
): Promise<{ rows: SecurityEventRow[]; nextCursor: string | null }> {
  const { actor, ...filter } = input;
  return executeQuery(deps, {
    actor,
    capability: "security.read",
    run: () => listSecurityEvents(deps.pool, filter),
  });
}

export type SecurityEventGroup = { kind: SecurityEventKind; count: number };

/**
 * Agrupado por tipo, com contagem — é o formato que responde "está
 * acontecendo algo anormal?" numa olhada (§8.1.8), em vez de uma lista crua
 * de centenas de linhas. Ordenado por contagem decrescente; `session.reuse`
 * não ganha tratamento especial aqui — o destaque dele é só na tela
 * (`--critico`), a contagem por si é neutra.
 */
export function groupSecurityEvents(rows: SecurityEventRow[]): SecurityEventGroup[] {
  const contagens = new Map<SecurityEventKind, number>();
  for (const row of rows) contagens.set(row.kind, (contagens.get(row.kind) ?? 0) + 1);
  return [...contagens.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
}
