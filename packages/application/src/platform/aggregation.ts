import type { Pool, PoolClient } from "pg";
import { authorize, type Actor, type Capability } from "@albora/core";
import { comAgregacao, insertAuditLog, insertSecurityEvent } from "@albora/db";
import { CommandDeniedError } from "../envelope/errors";

export type WithPlatformAggregationInput<T> = {
  actor: Actor;
  capability: Capability;
  reason: string;
  action?: string;
  run: (client: PoolClient) => Promise<T>;
};

/**
 * Única porta sancionada para cruzar eventos fora do papel de agregação
 * dedicado — o lugar onde o isolamento por tenant é quebrado de propósito,
 * e por isso o que mais precisa de trilha. Aqui a auditoria é PRÉ-CONDIÇÃO,
 * não efeito colateral: se `insertAuditLog` falhar, a agregação NUNCA roda.
 * É uma exceção consciente à regra "leitura não cai por falha de auditoria"
 * do ADR 0016 §6.2 — vale aqui porque cruzar tenant é a leitura mais
 * sensível do produto, e o custo é um INSERT antes de uma query de painel.
 * Não "conserte" isso achando que é inconsistência com `executeQuery`.
 *
 * A escrita usa `deps.pool` (papel `albora_app`, dono do GRANT em
 * audit_log), em conexão separada de `deps.aggregatorPool` (papel
 * `albora_agregador`, BYPASSRLS — a migration 0060 não concede INSERT em
 * audit_log a ele; gravar por ali falha por privilégio). Como a auditoria
 * já terminou antes de `comAgregacao` sequer conectar, o `auditar` síncrono
 * que o primitivo exige (chamado antes do BEGIN, ver packages/db/src/event.ts)
 * fica vazio — não há mais nada para ele fazer.
 */
export async function withPlatformAggregation<T>(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: WithPlatformAggregationInput<T>,
): Promise<T> {
  if (!input.reason.trim()) {
    throw new CommandDeniedError(input.capability, "motivo é obrigatório para agregação cross-tenant");
  }

  const decision = authorize({ actor: input.actor, capability: input.capability });
  if (decision.kind !== "allowed") {
    void insertSecurityEvent(deps.pool, {
      kind: "capability.denied",
      actorKind: "staff",
      actorId: input.actor.staffUserId,
      requestId: input.actor.requestId,
      metadata: { capability: input.capability },
    });
    const reason = decision.kind === "denied" ? decision.reason : `autorização exige ${decision.kind}`;
    throw new CommandDeniedError(input.capability, reason);
  }

  const action = input.action ?? "aggregation.read";
  const client = await deps.pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: input.actor.staffUserId,
      action,
      targetKind: "platform",
      targetId: null,
      reason: input.reason,
      requestId: input.actor.requestId,
    });
  } finally {
    client.release();
  }

  return comAgregacao(
    deps.aggregatorPool,
    input.reason,
    () => {
      // Auditoria já gravada acima, em conexão separada e antes do BEGIN —
      // este callback existe só porque `comAgregacao` o exige.
    },
    input.run,
  );
}
