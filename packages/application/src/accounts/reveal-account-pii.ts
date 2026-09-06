import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { getRawAccountContact } from "@albora/db";
import { executeCommand } from "../envelope/command";

export type RevealAccountPiiInput = { actor: Actor; reason: string; accountId: string };
export type RevealAccountPiiResult = { email: string };

/**
 * `accounts.pii.reveal` não tem política em `POLICIES` — sempre `allowed`
 * para quem tem a capacidade (spec §5.3: "Permitida, sempre auditada"). A
 * garantia inteira desta ação está no `reason` obrigatório e na linha de
 * `audit_log` — não em fricção extra na autorização.
 *
 * `run` lê pelo `tx` (a mesma conexão/transação do envelope), nunca por
 * `deps.pool` direto — é o que garante que a leitura participa da mesma
 * transação que grava `audit_log` (ADR 0016 §2).
 */
export async function revealAccountPii(
  deps: { pool: Pool },
  input: RevealAccountPiiInput,
): Promise<RevealAccountPiiResult> {
  return executeCommand(deps, {
    actor: input.actor,
    capability: "accounts.pii.reveal",
    reason: input.reason,
    target: { kind: "account", id: input.accountId },
    action: "accounts.pii.reveal",
    run: async (tx) => {
      const contato = await getRawAccountContact(tx, input.accountId);
      if (!contato) throw new Error(`conta ${input.accountId} não encontrada`);
      return contato;
    },
  });
}
