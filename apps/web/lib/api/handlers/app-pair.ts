import { criarCodigoPareamentoApp, ErroResgateDePareamento, resgatarCodigoPareamentoApp } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseFourDigitCode,
  parseJsonBody,
  requireConfig,
  requireGuestSession,
  sessionCookieHeader,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

const CODE_TTL_MINUTES = 15;

type RedeemBody = { codigo?: unknown };

/**
 * A web gera o codigo de 4 digitos para o app resgatar (spec A-11).
 *
 * O evento e a sessao vêm do cookie de quem já entrou — nunca do corpo.
 */
export async function postPairCode(req: Request) {
  const configError = requireConfig("app.parear", { log: false });
  if (configError) return configError;

  const auth = await requireGuestSession(req, "Entre no evento antes de parear o app");
  if (auth instanceof Response) return auth;

  const limit = consume(`app.parear:${auth.rateLimitKey}`, 12, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    const { code, expiraEm: expires } = await criarCodigoPareamentoApp(
      getPool(),
      auth.session.eventoId,
      auth.session.sessaoId,
      expiresAt,
    );

    console.log("app.pareamento_criado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      expiraEm: expires.toISOString(),
    });

    return jsonOk({
      codigo: code,
      expiraEm: expires.toISOString(),
      validadeMinutos: CODE_TTL_MINUTES,
    });
  } catch (e) {
    return unexpectedError("app.parear", e);
  }
}

/**
 * O app instalado digita o codigo e recebe a sessao da web (spec A-11).
 *
 * Sem sessao previa: o codigo *é* a credencial. Resposta traz slug e sessaoId;
 * o token vai no cookie HttpOnly (e no corpo para o cliente nativo).
 */
export async function postRedeemPairCode(req: Request) {
  const configError = requireConfig("app.parear.resgatar", { log: false });
  if (configError) return configError;

  const limited = enforceRateLimit(req, null, {
    max: 20,
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<RedeemBody>(req);
  if (parsed instanceof Response) return parsed;

  const code = parseFourDigitCode(parsed.data.codigo);
  if (code instanceof Response) return code;

  const cfg = config();

  try {
    const redeemed = await resgatarCodigoPareamentoApp(
      getPool(),
      cfg.sessionSecret,
      code,
      cfg.duracaoSessaoHoras,
      new Date(),
    );

    console.log("app.pareamento_resgatado", {
      eventoId: redeemed.eventoId,
      sessaoId: redeemed.sessaoId,
    });

    return jsonOk(
      { slug: redeemed.slug, sessaoId: redeemed.sessaoId },
      {
        headers: {
          "set-cookie": sessionCookieHeader(redeemed.token, cfg.duracaoSessaoHoras),
        },
      },
    );
  } catch (e) {
    if (e instanceof ErroResgateDePareamento) {
      console.warn("app.resgate_recusado", { motivo: e.motivo });
      return errorResponse(409, "app.pareamento_invalido", "Código inválido ou expirado");
    }
    return unexpectedError("app.parear.resgatar", e);
  }
}
