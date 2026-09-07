import type { Pool } from "pg";
import { findStaffByEmail, insertAuditLog, insertSecurityEvent } from "@albora/db";

export type CompleteGoogleLoginStaffInput = { email: string; ipHash: string };
export type CompleteGoogleLoginStaffResult = { ok: true; staffUserId: string } | { ok: false };

/**
 * NUNCA cria staff — nasce só por convite (`staff.manage`). "Não existe" e
 * "existe mas suspenso" devolvem o MESMO `{ ok: false }` e o mesmo
 * `security_events`, pra não virar oráculo que revela quem é da equipe.
 * Emissão de sessão (`issueStaffSession`, endurecimento herdado: idle,
 * absoluto, rotação) fica a cargo do chamador em `apps/web` — este caso de
 * uso só resolve identidade e audita, mesma fronteira de `completeStaffLogin`.
 */
export async function completeGoogleLoginStaff(
  pool: Pool,
  input: CompleteGoogleLoginStaffInput,
): Promise<CompleteGoogleLoginStaffResult> {
  const staff = await findStaffByEmail(pool, input.email.trim().toLowerCase());

  if (!staff || staff.status !== "active") {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "staff_google" },
    });
    return { ok: false };
  }

  const client = await pool.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId: staff.id,
      action: "staff.login",
      targetKind: "staff_user",
      targetId: staff.id,
      reason: "login via Google OIDC",
      metadata: { via: "google" },
      ipHash: input.ipHash,
    });
  } finally {
    client.release();
  }

  return { ok: true, staffUserId: staff.id };
}
