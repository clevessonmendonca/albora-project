import type { Pool } from "pg";
import { authorize } from "@albora/core";
import { insertSecurityEvent } from "@albora/db";
import { CommandDeniedError } from "./errors";
import type { ExecuteQueryInput } from "./types";

/**
 * Assimetria intencional com `executeCommand`: aqui não há transação, e a
 * auditoria de negação (`security_events`) pode falhar sem derrubar a
 * operação — é o único lugar do envelope onde isso vale.
 */
export async function executeQuery<T>(deps: { pool: Pool }, input: ExecuteQueryInput<T>): Promise<T> {
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

  return input.run();
}
