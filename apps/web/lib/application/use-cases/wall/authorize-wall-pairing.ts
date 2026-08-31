/**
 * Use Case: Authorize Wall Pairing
 * 
 * Autoriza pareamento do telão com código de 6 caracteres.
 */

import { podeUsarTelao } from "@albora/core";
import {
  autorizarPareamento,
  withEvent,
  ErroAutorizacaoDePareamento,
  planoDoEvento,
} from "@albora/db";
import type { Pool } from "pg";

const WALL_CONSENT_VERSION = "1";

export type AuthorizeWallPairingInput = {
  eventoId: string;
  sessaoId: string;
  codigo: string;
};

export type AuthorizeWallPairingResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Autoriza pareamento do telão.
 * 
 * Validações:
 * - Plano permite telão (Completo)
 * - Código válido e não expirado
 * 
 * Spec 010: evento da sessão de quem autoriza, nunca do corpo.
 * 
 * @param input - eventoId, sessaoId e código de pareamento
 * @param pool - Pool de conexões
 * @returns Sucesso ou erro com código específico
 */
export async function authorizeWallPairing(
  input: AuthorizeWallPairingInput,
  pool: Pool,
): Promise<AuthorizeWallPairingResult> {
  try {
    // Verificar plano
    const plan = await withEvent(pool, input.eventoId, (c) =>
      planoDoEvento(c, input.eventoId),
    );

    if (!podeUsarTelao(plan)) {
      return {
        ok: false,
        code: "plano.telao",
        message:
          "O telão entra no plano Completo. No painel do anfitrião dá para subir de plano sem travar a festa.",
      };
    }

    // Autorizar pareamento
    await autorizarPareamento(
      pool,
      input.codigo,
      input.eventoId,
      WALL_CONSENT_VERSION,
      new Date(),
    );

    console.log("parede.pareamento_autorizado", {
      eventoId: input.eventoId,
      sessaoId: input.sessaoId,
    });

    return { ok: true };
  } catch (e) {
    if (e instanceof ErroAutorizacaoDePareamento) {
      console.warn("parede.autorizacao_recusada", {
        eventoId: input.eventoId,
        motivo: e.motivo,
      });
      return {
        ok: false,
        code: "parede.pareamento_invalido",
        message: "Código inválido ou expirado",
      };
    }
    throw e;
  }
}
