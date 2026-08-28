/**
 * Use Case: Create Wall Pairing
 * 
 * Cria pareamento para TV conectar ao telão.
 */

import { criarPareamento } from "@albora/db";
import type { Pool } from "pg";

const PAIRING_TTL_SECONDS = 10 * 60;

export type CreateWallPairingOutput = {
  code: string;
  pollToken: string;
  expiraEm: Date;
};

/**
 * Cria pareamento para TV.
 * 
 * Spec 010: sem sessão/evento ainda; código curto para a tela, token de poll.
 * 
 * @param sessionSecret - Segredo da sessão
 * @param pool - Pool de conexões
 * @returns Código, poll token e expiração
 */
export async function createWallPairing(
  sessionSecret: string,
  pool: Pool,
): Promise<CreateWallPairingOutput> {
  const expiraEm = new Date(Date.now() + PAIRING_TTL_SECONDS * 1000);
  const { code, pollToken } = await criarPareamento(
    pool,
    sessionSecret,
    expiraEm,
  );

  console.log("parede.pareamento_criado", {
    expiraEm: expiraEm.toISOString(),
  });

  return { code, pollToken, expiraEm };
}

export { PAIRING_TTL_SECONDS };
