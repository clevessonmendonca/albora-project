import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import { listActiveStaffUsers } from "@albora/db";
import { executeQuery } from "../envelope/query";

/** Reexportado — a rota (`apps/web/app/console/...`) nunca importa `@albora/db` direto (guard `camadas`, ADR 0016). */
export type { ActiveStaffOption } from "@albora/db";

export type ListActiveStaffInput = { actor: Actor };

/**
 * Opções pro dropdown "Atribuir a" da mesa de suporte (T5) — gate na mesma
 * capacidade que autoriza a atribuição em si (`tickets.assign`), não
 * `staff.manage`: quem não pode atribuir não precisa da lista de quem
 * poderia receber.
 */
export async function listActiveStaff(deps: { pool: Pool }, input: ListActiveStaffInput) {
  return executeQuery(deps, {
    actor: input.actor,
    capability: "tickets.assign",
    run: () => listActiveStaffUsers(deps.pool),
  });
}
