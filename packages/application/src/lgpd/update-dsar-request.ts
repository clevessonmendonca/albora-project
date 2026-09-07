import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { updateDsarRequestOnClient, type DsarStatus } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type UpdateDsarRequestInput = {
  actor: Actor;
  reason: string;
  id: string;
  status?: DsarStatus;
  assigneeStaffId?: string | null;
  evidenceUrl?: string | null;
  notes?: string | null;
};

/**
 * Um comando só cobre atribuir, mudar status, anexar comprovante e concluir
 * — todos são a mesma mutação de linha (`UPDATE dsar_requests`), então um
 * envelope de comando só, não quatro. `notes` é texto livre escrito por
 * staff: nunca entra em `metadata` da auditoria (só `status`, que é o que
 * de fato precisa ser rastreável na trilha) — auditar o texto livre
 * despejaria dado do titular num lugar pensado pra contador/id.
 */
export async function updateDsarRequest(deps: { pool: Pool }, input: UpdateDsarRequestInput): Promise<void> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "lgpd.dsar.execute",
    reason: input.reason,
    target: { kind: "dsar_request", id: input.id },
    action: "lgpd.dsar.update",
    metadata: { status: input.status },
    run: (tx) =>
      updateDsarRequestOnClient(tx, {
        id: input.id,
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.assigneeStaffId !== undefined ? { assigneeStaffId: input.assigneeStaffId } : {}),
        ...(input.evidenceUrl !== undefined ? { evidenceUrl: input.evidenceUrl } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      }),
  });
}
