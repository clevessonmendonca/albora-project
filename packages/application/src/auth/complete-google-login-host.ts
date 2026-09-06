import type { Pool } from "pg";

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
 * STUB — implementação real fica para T5. Interface fixada aqui para o
 * roteador do callback (T4) despachar por `surface` antes do caso de uso
 * existir: casa o e-mail confirmado pelo Google com uma conta de host,
 * emite sessão (mesmo mecanismo de `issueMarkedHostSession`,
 * `packages/db/src/host-auth.ts`) e devolve o token pronto para
 * `hostCookie`. `ok: false` cobre "sem conta com este e-mail" — motivo não
 * diferenciado ao chamador, mesma disciplina anti-enumeração de
 * `completeStaffLogin`. Nunca chame isto fora de teste com mock antes de
 * T5 substituir o corpo: falha alto de propósito.
 */
export async function completeGoogleLoginHost(
  _pool: Pool,
  _sessionSecret: string,
  _input: CompleteGoogleLoginHostInput,
): Promise<CompleteGoogleLoginHostResult> {
  throw new Error("completeGoogleLoginHost: ainda não implementado (T5)");
}
