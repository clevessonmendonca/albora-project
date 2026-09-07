import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listPendingImpersonationRequestsAdmin, type ImpersonationRequestRow } from "@albora/db";
import { executeQuery } from "../envelope/query";

export type ListPendingImpersonationRequestsInput = { actor: Actor };

/**
 * "Direto da barra de contexto" (T10): lista TODOS os pedidos pendentes da
 * plataforma, cross-staff — diferente de `getActiveImpersonationForStaff`/
 * `getLatestImpersonationRequestForRequesterAndAccount`, que são
 * autoconsulta, este é dado de outras pessoas. Por isso passa por
 * `executeQuery` com `impersonate.approve` (só `owner` tem, `roles.ts`),
 * mesmo a rota já checando `hasCapability` antes de chamar — nunca confiar
 * só na checagem do lado de fora.
 */
export async function listPendingImpersonationRequests(
  deps: { pool: Pool },
  input: ListPendingImpersonationRequestsInput,
): Promise<ImpersonationRequestRow[]> {
  return executeQuery(deps, {
    actor: input.actor,
    capability: "impersonate.approve",
    run: () => listPendingImpersonationRequestsAdmin(deps.pool),
  });
}
