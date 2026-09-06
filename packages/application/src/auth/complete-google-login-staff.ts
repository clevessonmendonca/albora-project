import type { Pool } from "pg";

export type CompleteGoogleLoginStaffInput = { email: string; ipHash: string };
export type CompleteGoogleLoginStaffResult = { ok: true; staffUserId: string } | { ok: false };

/**
 * STUB — implementação real fica para T6. Interface fixada aqui para o
 * roteador do callback (T4) despachar por `surface` antes do caso de uso
 * existir. Mesmo formato de resultado de `completeStaffLogin`
 * (`packages/application/src/staff/complete-login.ts`): casa o e-mail
 * confirmado pelo Google com uma conta de staff ativa, grava
 * `security_events` em falha (`kind: "login.failed"`, mesma disciplina).
 * Nunca chame isto fora de teste com mock antes de T6 substituir o corpo:
 * falha alto de propósito.
 */
export async function completeGoogleLoginStaff(
  _pool: Pool,
  _input: CompleteGoogleLoginStaffInput,
): Promise<CompleteGoogleLoginStaffResult> {
  throw new Error("completeGoogleLoginStaff: ainda não implementado (T6)");
}
