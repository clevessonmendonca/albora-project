import type { Pool } from "pg";
import { consumeStaffMagicLink, insertAuditLog, insertSecurityEvent } from "@albora/db";
import { hashStaffMagicLinkToken, isValidStaffMagicLinkSignature } from "./token";

export type CompleteStaffLoginInput = { token: string; ipHash: string };
export type CompleteStaffLoginResult = { ok: true; staffUserId: string } | { ok: false };

/**
 * Consome o magic link — uso único, TTL de 15min. `consumeStaffMagicLink` é
 * o `UPDATE ... RETURNING` atômico (marca usado e devolve o dono na mesma
 * instrução): nunca ler-depois-escrever, ou dois cliques simultâneos no
 * mesmo link consumiriam ambos. Nunca logar o token — nem em erro, nem em
 * `metadata`: é PII sob LGPD.
 */
export async function completeStaffLogin(pool: Pool, input: CompleteStaffLoginInput): Promise<CompleteStaffLoginResult> {
  // Assinatura inválida é rejeitada aqui, sem ida ao banco — token forjado custa microssegundos.
  if (!isValidStaffMagicLinkSignature(input.token)) {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "staff_login" },
    });
    return { ok: false };
  }

  const tokenHash = hashStaffMagicLinkToken(input.token);
  const staffUserId = await consumeStaffMagicLink(pool, tokenHash);

  if (!staffUserId) {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "staff_login" },
    });
    return { ok: false };
  }

  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: staffUserId,
      action: "staff.login",
      targetKind: "staff_user",
      targetId: staffUserId,
      reason: "login por magic link",
      ipHash: input.ipHash,
    });
  } finally {
    client.release();
  }

  return { ok: true, staffUserId };
}
