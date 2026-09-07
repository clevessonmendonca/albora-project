import type { Pool } from "pg";
import {
  insertAuditLog,
  insertSecurityEvent,
  issueMarkedHostSession,
  resolveOrCreateAccountByEmail,
  VALIDADE_HOST_SESSAO_HORAS,
} from "@albora/db";

export type CompleteGoogleLoginHostInput = { email: string; ipHash: string };

/**
 * `validityHours` viaja no resultado (não em `VALIDADE_HOST_SESSAO_HORAS`
 * importado de `@albora/db`) porque a rota de callback (T4) não pode
 * importar valor de `@albora/db` diretamente — só de `@albora/application`.
 * Mesmo padrão de `apps/web/lib/application/use-cases/admin/consume-magic-link.ts`
 * (`validadeHoras` no resultado, não a constante crua na borda).
 */
export type CompleteGoogleLoginHostResult =
  | { ok: true; token: string; validityHours: number }
  | { ok: false };

/**
 * O e-mail já chega verificado pelo callback do Google (T2/T4) — aqui só
 * resolve/cria a conta (mesma semântica de `emitirMagicLink`, via
 * `resolveOrCreateAccountByEmail`, sem o efeito colateral do link) e emite
 * a sessão de host (`issueMarkedHostSession`, `impersonationId: null`:
 * login Google nunca nasce de uma aprovação de impersonação). Nenhum token
 * do Google chega aqui — só o e-mail resolvido pelo provider. `ok: false`
 * cobre qualquer falha na resolução/emissão — motivo não diferenciado ao
 * chamador, mesma disciplina anti-enumeração de `completeStaffLogin`.
 */
export async function completeGoogleLoginHost(
  pool: Pool,
  sessionSecret: string,
  input: CompleteGoogleLoginHostInput,
): Promise<CompleteGoogleLoginHostResult> {
  try {
    const { accountId } = await resolveOrCreateAccountByEmail(pool, input.email);
    const expiresAt = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 60 * 60 * 1000);
    const { token } = await issueMarkedHostSession(pool, sessionSecret, accountId, null, expiresAt);

    const client = await pool.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "host",
        actorId: accountId,
        action: "host.login.google",
        targetKind: "account",
        targetId: accountId,
        reason: "login via Google OIDC",
        ipHash: input.ipHash,
      });
    } finally {
      client.release();
    }

    return { ok: true, token, validityHours: VALIDADE_HOST_SESSAO_HORAS };
  } catch {
    await insertSecurityEvent(pool, {
      kind: "login.failed",
      ipHash: input.ipHash,
      metadata: { surface: "host_google" },
    });
    return { ok: false };
  }
}
