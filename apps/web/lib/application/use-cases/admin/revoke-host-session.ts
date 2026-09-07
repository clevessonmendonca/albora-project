/**
 * Use Case: Revoke Host Session
 *
 * Revoga sessão do anfitrião (sign-out).
 */
import { revogarHostSessao } from "@albora/db";
import type { Pool } from "pg";

export type RevokeHostSessionInput = {
  sessionSecret: string;
  token: string | null;
};

export async function revokeHostSession(
  input: RevokeHostSessionInput,
  pool: Pool,
): Promise<void> {
  if (!input.token) return;

  try {
    await revogarHostSessao(pool, input.sessionSecret, input.token);
  } catch {
    // Sair é best-effort: mesmo que a revogação falhe, o cookie some.
  }
}
