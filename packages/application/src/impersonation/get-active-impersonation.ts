import type { Pool } from "pg";
import { getActiveImpersonationForStaff as getActiveImpersonationForStaffOnClient, type ImpersonationRequestRow } from "@albora/db";

/**
 * Reexportado — a rota (`apps/web/app/console/...`) nunca importa
 * `@albora/db` direto (guard `camadas`, ADR 0016).
 */
export type { ImpersonationRequestRow } from "@albora/db";

/**
 * Banner de T10: existe, para o STAFF QUE ESTÁ CHAMANDO, uma janela ativa
 * agora? Sem gate de capacidade — é autoconsulta por `staffUserId`, nunca
 * a sessão de outro staff; não há dado alheio a proteger aqui, e todo
 * ator autenticado precisa desta resposta pra saber se o banner aparece,
 * mesmo papéis sem `impersonate.request` (defesa em profundidade: se o
 * papel mudou com uma sessão ainda ativa, o aviso continua aparecendo).
 */
export async function getActiveImpersonationForStaff(pool: Pool, staffUserId: string): Promise<ImpersonationRequestRow | null> {
  return getActiveImpersonationForStaffOnClient(pool, staffUserId);
}
