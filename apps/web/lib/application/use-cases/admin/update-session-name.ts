/**
 * Use Case: Update Session Name
 *
 * Renomeia ou oculta nome de sessão de convidado.
 */
import { definirNomeDaSessaoDoHost, ErroNomeInvalido } from "@albora/db";
import type { Pool } from "pg";

export type UpdateSessionNameInput = {
  accountId: string;
  eventId: string;
  sessaoId: string;
  acao: "ocultar" | "renomear";
  nome?: string | undefined;
};

export type UpdateSessionNameResult =
  | {
      ok: true;
      id: string;
      nome: string;
      fotos: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function updateSessionName(
  input: UpdateSessionNameInput,
  pool: Pool,
): Promise<UpdateSessionNameResult> {
  try {
    const atualizada = await definirNomeDaSessaoDoHost(
      pool,
      input.accountId,
      input.eventId,
      input.sessaoId,
      input.acao === "ocultar"
        ? { acao: "ocultar" }
        : { acao: "renomear", nome: input.nome ?? "" },
    );

    if (!atualizada) {
      return {
        ok: false,
        code: "sessao.nao_encontrada",
        message: "Convidado não encontrado",
      };
    }

    console.log("admin.nome_sessao", {
      eventoId: input.eventId,
      sessaoId: input.sessaoId,
      acao: input.acao,
    });

    return {
      ok: true,
      id: atualizada.id,
      nome: atualizada.nome,
      fotos: atualizada.fotos,
    };
  } catch (e) {
    if (e instanceof ErroNomeInvalido) {
      return {
        ok: false,
        code: "validation_error",
        message: "Nome inválido",
      };
    }
    throw e;
  }
}
