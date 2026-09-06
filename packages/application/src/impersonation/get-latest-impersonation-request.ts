import type { Pool } from "pg";
import {
  getLatestImpersonationRequestForRequesterAndAccount as getLatestImpersonationRequestOnClient,
  type ImpersonationRequestRow,
} from "@albora/db";

/**
 * Reexportado — a rota (`apps/web/app/console/...`) nunca importa
 * `@albora/db` direto (guard `camadas`, ADR 0016).
 *
 * Mesma razão de `get-active-impersonation.ts`: autoconsulta pelo par
 * (staff que chama, conta que está olhando) — sem gate de capacidade
 * aqui porque quem chama já decidiu com `hasCapability("impersonate.request")`
 * se faz sentido perguntar (a página só busca quando a capacidade existe).
 */
export async function getLatestImpersonationRequestForRequesterAndAccount(
  pool: Pool,
  requesterStaffId: string,
  targetAccountId: string,
): Promise<ImpersonationRequestRow | null> {
  return getLatestImpersonationRequestOnClient(pool, requesterStaffId, targetAccountId);
}
