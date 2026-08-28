import { criarCodigoPareamentoApp, ErroResgateDePareamento, resgatarCodigoPareamentoApp, resgatarPassagemPareamentoApp } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseFourDigitCode,
  parseJsonBody,
  parsePassagemToken,
  requireConfig,
  requireGuestSession,
  sessionCookieHeader,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

const CODE_TTL_MINUTES = 15;

type RedeemBody = { codigo?: unknown; passagem?: unknown };

/** Gera código de 4 dígitos para o app resgatar (spec A-11): evento e sessão do cookie, nunca do corpo; também emite passagem one-shot (ADR 0009). */
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

  const cfg = config();

  try {
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);
    const { code, expiraEm: expires, passagem } = await criarCodigoPareamentoApp(
      getPool(),
      cfg.sessionSecret,
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
      passagem,
    });
  } catch (e) {
    return unexpectedError("app.parear", e);
  }
}

/** App resgata código/passagem e recebe a sessão da web (spec A-11): credencial é o ticket; token no cookie HttpOnly e no corpo para o cliente nativo. */
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

  const cfg = config();
  const passagemRaw = typeof parsed.data.passagem === "string" ? parsed.data.passagem.trim() : "";

  try {
    const redeemed =
      passagemRaw.length > 0
        ? await (async () => {
            const passagem = parsePassagemToken(passagemRaw);
            if (passagem instanceof Response) return passagem;
            return resgatarPassagemPareamentoApp(
              getPool(),
              cfg.sessionSecret,
              passagem,
              cfg.duracaoSessaoHoras,
              new Date(),
            );
          })()
        : await (async () => {
            const code = parseFourDigitCode(parsed.data.codigo);
            if (code instanceof Response) return code;
            return resgatarCodigoPareamentoApp(
              getPool(),
              cfg.sessionSecret,
              code,
              cfg.duracaoSessaoHoras,
              new Date(),
            );
          })();

    if (redeemed instanceof Response) return redeemed;

    console.log("app.pareamento_resgatado", {
      eventoId: redeemed.eventoId,
      sessaoId: redeemed.sessaoId,
    });

    return jsonOk(
      {
        slug: redeemed.slug,
        sessaoId: redeemed.sessaoId,
        token: redeemed.token,
        eventoId: redeemed.eventoId,
      },
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
