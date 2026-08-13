import { criarCodigoPareamentoApp } from "@albora/db";
import { errorResponse, jsonOk, requireConfig, requireGuestSession, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const VALIDADE_MINUTOS = 15;

/**
 * A web gera o codigo de 4 digitos para o app resgatar (spec A-11).
 *
 * O evento e a sessao vêm do cookie de quem já entrou — nunca do corpo.
 */
export async function POST(req: Request) {
  const configError = requireConfig("app.parear", { log: false });
  if (configError) return configError;

  const auth = await requireGuestSession(req, "Entre no evento antes de parear o app");
  if (auth instanceof Response) return auth;

  const limite = consume(`app.parear:${auth.rateLimitKey}`, 12, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);
    const { code, expiraEm: expira } = await criarCodigoPareamentoApp(
      getPool(),
      auth.session.eventoId,
      auth.session.sessaoId,
      expiraEm,
    );

    console.log("app.pareamento_criado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      expiraEm: expira.toISOString(),
    });

    return jsonOk({
      codigo: code,
      expiraEm: expira.toISOString(),
      validadeMinutos: VALIDADE_MINUTOS,
    });
  } catch (e) {
    return unexpectedError("app.parear", e);
  }
}
