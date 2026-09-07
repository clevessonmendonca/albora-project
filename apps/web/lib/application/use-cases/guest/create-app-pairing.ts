/**
 * Use Case: Create App Pairing
 *
 * Cria código de 4 dígitos para pareamento do app nativo.
 */
import { criarCodigoPareamentoApp } from "@albora/db";
import type { Pool } from "pg";

const CODE_TTL_MINUTES = 15;

export type CreateAppPairingInput = {
  eventoId: string;
  sessaoId: string;
  sessionSecret: string;
};

export type CreateAppPairingOutput = {
  codigo: string;
  expiraEm: Date;
  validadeMinutos: number;
  passagem: string;
};

export async function createAppPairing(
  input: CreateAppPairingInput,
  pool: Pool,
): Promise<CreateAppPairingOutput> {
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  const { code, expiraEm: expires, passagem } = await criarCodigoPareamentoApp(
    pool,
    input.sessionSecret,
    input.eventoId,
    input.sessaoId,
    expiresAt,
  );

  console.log("app.pareamento_criado", {
    eventoId: input.eventoId,
    sessaoId: input.sessaoId,
    expiraEm: expires.toISOString(),
  });

  return {
    codigo: code,
    expiraEm: expires,
    validadeMinutos: CODE_TTL_MINUTES,
    passagem,
  };
}

export { CODE_TTL_MINUTES };
