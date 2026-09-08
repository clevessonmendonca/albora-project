import type { Pool } from "pg";
import { authorize } from "@albora/core";
import { insertAuditLog } from "@albora/db";
import { ApprovalRequiredError, CommandDeniedError, ReauthRequiredError } from "./errors";
import type { ExecuteCommandInput } from "./types";

/**
 * Ordem fixa (ADR 0016 §2): reason não-vazio -> authorize -> BEGIN -> run(tx)
 * -> INSERT audit_log NA MESMA TX -> COMMIT. Se a auditoria falhar, o efeito
 * de `run` desce junto — um reembolso sem registro é pior que um reembolso
 * que não ocorreu.
 */
export async function executeCommand<T>(
  deps: { pool: Pool },
  input: ExecuteCommandInput<T>,
): Promise<T> {
  if (!input.reason.trim()) {
    throw new CommandDeniedError(input.capability, "motivo é obrigatório para qualquer mutação do console");
  }

  const decision = authorize({
    actor: input.actor,
    capability: input.capability,
    ...(input.resource ? { resource: input.resource } : {}),
    ...(input.context ? { context: input.context } : {}),
  });

  if (decision.kind === "denied") throw new CommandDeniedError(input.capability, decision.reason);
  if (decision.kind === "needsReauth") throw new ReauthRequiredError(input.capability, decision.maxAgeSeconds);
  if (decision.kind === "needsApproval") throw new ApprovalRequiredError(input.capability, decision.approverCapability);

  const client = await deps.pool.connect();
  try {
    await client.query("BEGIN");
    // Porta de escrita para staff em tabelas com FORCE RLS que não têm
    // política própria de staff (ex.: support_tickets/support_messages,
    // migration 0063) — só existe dentro da transação de um comando já
    // autorizado, nunca fora dela.
    await client.query("SELECT set_config('app.staff_command', 'true', true)");
    const result = await input.run(client);
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: input.actor.staffUserId,
      action: input.action,
      targetKind: input.target.kind,
      targetId: input.target.id ?? null,
      reason: input.reason,
      metadata: input.metadata ?? {},
      requestId: input.actor.requestId,
    });
    await client.query("COMMIT");
    return result;
  } catch (erro) {
    await client.query("ROLLBACK").catch(() => {});
    throw erro;
  } finally {
    client.release();
  }
}
