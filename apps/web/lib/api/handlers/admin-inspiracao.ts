import { comConta, removerIdeiaSalva, salvarIdeia } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { violacaoDeChaveEstrangeira } from "@/lib/api/erros-do-banco";

/** Salvar uma ideia é dado de conta (ADR 0023) — ninguém vê o que o outro salvou. */
export async function PUT(req: Request, ctx: { params: Promise<{ ideiaId: string }> }) {
  return alternar(req, ctx, "salvar");
}

export async function DELETE(req: Request, ctx: { params: Promise<{ ideiaId: string }> }) {
  return alternar(req, ctx, "remover");
}

async function alternar(
  req: Request,
  ctx: { params: Promise<{ ideiaId: string }> },
  acao: "salvar" | "remover",
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para salvar ideias",
  });
  if (auth instanceof Response) return auth;

  const { ideiaId } = await ctx.params;
  if (!UUID_RE.test(ideiaId)) {
    return errorResponse(422, "inspiracao.ideia_invalida", "Ideia não encontrada");
  }

  try {
    await comConta(getPool(), auth.host.accountId, (c) =>
      acao === "salvar"
        ? salvarIdeia(c, auth.host.accountId, ideiaId)
        : removerIdeiaSalva(c, auth.host.accountId, ideiaId),
    );

    return jsonOk({ salva: acao === "salvar" });
  } catch (erro) {
    // Ideia que não existe é 404, não falha nossa: o id é UUID válido vindo da
    // URL, e a FK de `inspiration_saves` é quem recusa. Sem isto, qualquer
    // anfitrião derruba um 500 e um evento de erro com um id inventado.
    if (violacaoDeChaveEstrangeira(erro)) {
      return errorResponse(404, "inspiracao.ideia_ausente", "Ideia não encontrada");
    }
    return unexpectedError(`admin.inspiracao.${acao}`, erro);
  }
}
