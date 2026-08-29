/**
 * Use Case: Redeem App Pairing
 *
 * Resgata código ou passagem de pareamento do app nativo.
 */
import {
  resgatarCodigoPareamentoApp,
  resgatarPassagemPareamentoApp,
  ErroResgateDePareamento,
} from "@albora/db";
import type { Pool } from "pg";

export type RedeemAppPairingInput = {
  sessionSecret: string;
  duracaoSessaoHoras: number;
  codigo?: string | undefined;
  passagem?: string | undefined;
};

export type RedeemAppPairingResult =
  | {
      ok: true;
      slug: string;
      sessaoId: string;
      token: string;
      eventoId: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function redeemAppPairing(
  input: RedeemAppPairingInput,
  pool: Pool,
): Promise<RedeemAppPairingResult> {
  const agora = new Date();

  try {
    let redeemed;

    if (input.passagem) {
      redeemed = await resgatarPassagemPareamentoApp(
        pool,
        input.sessionSecret,
        input.passagem,
        input.duracaoSessaoHoras,
        agora,
      );
    } else if (input.codigo) {
      redeemed = await resgatarCodigoPareamentoApp(
        pool,
        input.sessionSecret,
        input.codigo,
        input.duracaoSessaoHoras,
        agora,
      );
    } else {
      return {
        ok: false,
        code: "app.pareamento_invalido",
        message: "Código ou passagem obrigatório",
      };
    }

    console.log("app.pareamento_resgatado", {
      eventoId: redeemed.eventoId,
      sessaoId: redeemed.sessaoId,
    });

    return {
      ok: true,
      slug: redeemed.slug,
      sessaoId: redeemed.sessaoId,
      token: redeemed.token,
      eventoId: redeemed.eventoId,
    };
  } catch (e) {
    if (e instanceof ErroResgateDePareamento) {
      console.warn("app.resgate_recusado", { motivo: e.motivo });
      return {
        ok: false,
        code: "app.pareamento_invalido",
        message: "Código inválido ou expirado",
      };
    }
    throw e;
  }
}
