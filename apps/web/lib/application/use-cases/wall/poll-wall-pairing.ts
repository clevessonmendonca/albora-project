/**
 * Use Case: Poll Wall Pairing
 * 
 * Verifica status do pareamento (pendente, expirado, pronto).
 */

import { VALIDADE_DA_PAREDE_HORAS } from "@albora/core";
import { finalizarPareamento } from "@albora/db";
import type { Pool } from "pg";

export type PollWallPairingInput = {
  pollToken: string;
  sessionSecret: string;
};

export type PollWallPairingResult =
  | { status: "pendente" }
  | { status: "expirado" }
  | { status: "pronto"; eventoId: string; cracha: string };

/**
 * Verifica status do pareamento.
 * 
 * Spec 010: banco consome o pareamento e emite o crachá.
 * 
 * @param input - pollToken e sessionSecret
 * @param pool - Pool de conexões
 * @returns Status (pendente, expirado ou pronto com crachá)
 */
export async function pollWallPairing(
  input: PollWallPairingInput,
  pool: Pool,
): Promise<PollWallPairingResult> {
  const expiraCrachaEm = new Date(
    Date.now() + VALIDADE_DA_PAREDE_HORAS * 3600 * 1000,
  );

  const result = await finalizarPareamento(
    pool,
    input.sessionSecret,
    input.pollToken,
    expiraCrachaEm,
    new Date(),
  );

  if (result.status === "pendente") {
    return { status: "pendente" };
  }

  if (result.status === "expirado") {
    return { status: "expirado" };
  }

  console.log("parede.pareamento_pronto", { eventoId: result.eventoId });

  return {
    status: "pronto",
    eventoId: result.eventoId,
    cracha: result.cracha,
  };
}

export { VALIDADE_DA_PAREDE_HORAS };
