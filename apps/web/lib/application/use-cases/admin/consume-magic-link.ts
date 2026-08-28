/**
 * Use Case: Consume Magic Link
 *
 * Consome magic link e cria sessão de anfitrião.
 */
import {
  consumirMagicLink,
  ErroMagicLinkInvalido,
  VALIDADE_HOST_SESSAO_HORAS,
} from "@albora/db";
import type { Pool } from "pg";

export type ConsumeMagicLinkInput = {
  sessionSecret: string;
  token: string;
};

export type ConsumeMagicLinkResult =
  | {
      ok: true;
      token: string;
      accountId: string;
      validadeHoras: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function consumeMagicLink(
  input: ConsumeMagicLinkInput,
  pool: Pool,
): Promise<ConsumeMagicLinkResult> {
  try {
    const expiresAt = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 3600 * 1000);
    const session = await consumirMagicLink(
      pool,
      input.sessionSecret,
      input.token,
      expiresAt,
      new Date(),
    );

    console.log("admin.sessao_criada", { accountId: session.accountId });

    return {
      ok: true,
      token: session.token,
      accountId: session.accountId,
      validadeHoras: VALIDADE_HOST_SESSAO_HORAS,
    };
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      console.warn("admin.magic_link_recusado", { motivo: e.motivo });
      return {
        ok: false,
        code: "admin.link_invalido",
        message: "Link inválido ou expirado",
      };
    }
    throw e;
  }
}
