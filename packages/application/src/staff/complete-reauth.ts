import type { Pool } from "pg";
import { consumeStaffMagicLink, insertAuditLog, insertSecurityEvent } from "@albora/db";
import { hashStaffMagicLinkToken, isValidStaffMagicLinkSignature } from "./token";

export type CompleteStaffReauthInput = { token: string; ipHash: string; staffUserId: string };
export type CompleteStaffReauthResult = { ok: true } | { ok: false };

/**
 * Parente próximo de `completeStaffLogin`, com uma diferença de desenho: o
 * step-up NUNCA emite sessão nova, só carimba a sessão existente (quem
 * chama faz isso via `markStaffReauthenticated`, que lê o cookie atual —
 * `packages/application` não tem acesso a cookies). Por isso o link só
 * vale se o `staffUserId` que ele resolve bate com o da sessão atual:
 * usar o link de reauth de outro staff para reautenticar A SUA sessão
 * seria uma escalação, não uma confirmação.
 *
 * Assinatura inválida não toca o banco — nem para logar; é rejeição em
 * microssegundos, e um forjador de token não gera tráfego de query.
 */
export async function completeStaffReauth(pool: Pool, input: CompleteStaffReauthInput): Promise<CompleteStaffReauthResult> {
  if (!isValidStaffMagicLinkSignature(input.token)) {
    return { ok: false };
  }

  const tokenHash = hashStaffMagicLinkToken(input.token);
  const ownerId = await consumeStaffMagicLink(pool, tokenHash);

  if (!ownerId) {
    await insertSecurityEvent(pool, {
      kind: "reauth.failed",
      actorKind: "staff",
      actorId: input.staffUserId,
      ipHash: input.ipHash,
      metadata: { surface: "staff_reauth", reason: "token_invalido_ou_expirado" },
    });
    return { ok: false };
  }

  if (ownerId !== input.staffUserId) {
    await insertSecurityEvent(pool, {
      kind: "reauth.failed",
      actorKind: "staff",
      actorId: input.staffUserId,
      ipHash: input.ipHash,
      metadata: { surface: "staff_reauth", reason: "sessao_nao_pertence_ao_link" },
    });
    return { ok: false };
  }

  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: ownerId,
      action: "staff.reauth",
      targetKind: "staff_user",
      targetId: ownerId,
      reason: "step-up de reautenticação (magic link)",
      ipHash: input.ipHash,
    });
  } finally {
    client.release();
  }

  return { ok: true };
}
