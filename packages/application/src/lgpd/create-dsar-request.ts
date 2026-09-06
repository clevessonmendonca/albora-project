import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { createDsarRequestOnClient, type DsarKind, type DsarRequestRow } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type CreateDsarRequestInput = {
  actor: Actor;
  reason: string;
  kind: DsarKind;
  subjectAccountId: string;
  legalDueAt: Date;
};

/**
 * `legalDueAt` não tem default em lugar nenhum do envelope — nenhuma fonte
 * no produto define quantos dias cada tipo de pedido tem (RULING da task),
 * então quem registra o pedido informa o prazo explicitamente. Inventar
 * "15 dias para acesso, 30 para exclusão" fabricaria uma obrigação legal a
 * partir de nada, e um prazo errado no painel é pior que prazo nenhum.
 */
export async function createDsarRequest(deps: { pool: Pool }, input: CreateDsarRequestInput): Promise<DsarRequestRow> {
  // Gerado aqui, não pelo DEFAULT da coluna: `executeCommand` grava a
  // auditoria com `target.id` decidido antes de abrir a transação, então
  // sem isso um `create` auditaria `target_id = null` — "atendemos o
  // pedido" vira palavra contra palavra sem o id do próprio pedido na
  // trilha.
  const id = randomUUID();
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.execute",
    reason: input.reason,
    target: { kind: "dsar_request", id },
    action: "lgpd.dsar.create",
    metadata: { kind: input.kind, subjectAccountId: input.subjectAccountId },
    run: (tx) =>
      createDsarRequestOnClient(tx, {
        id,
        kind: input.kind,
        subjectAccountId: input.subjectAccountId,
        legalDueAt: input.legalDueAt,
      }),
  });
}
