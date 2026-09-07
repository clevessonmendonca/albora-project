import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireGuestSession,
  sessionCookieHeader,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { createAppPairing, redeemAppPairing } from "@/lib/application/use-cases/guest";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { redeemAppPairSchema } from "@/lib/infrastructure/api/validators";

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
    const resultado = await createAppPairing(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        sessionSecret: cfg.sessionSecret,
      },
      getPool(),
    );

    return jsonOk({
      codigo: resultado.codigo,
      expiraEm: resultado.expiraEm.toISOString(),
      validadeMinutos: resultado.validadeMinutos,
      passagem: resultado.passagem,
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

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validation = validateBody(parsed.data, redeemAppPairSchema);
  if (validation instanceof Response) return validation;

  const cfg = config();

  const resultado = await redeemAppPairing(
    {
      sessionSecret: cfg.sessionSecret,
      duracaoSessaoHoras: cfg.duracaoSessaoHoras,
      ...(validation.codigo !== undefined ? { codigo: validation.codigo } : {}),
      ...(validation.passagem !== undefined ? { passagem: validation.passagem } : {}),
    },
    getPool(),
  );

  if (!resultado.ok) {
    return errorResponse(409, resultado.code, resultado.message);
  }

  return jsonOk(
    {
      slug: resultado.slug,
      sessaoId: resultado.sessaoId,
      token: resultado.token,
      eventoId: resultado.eventoId,
    },
    {
      headers: {
        "set-cookie": sessionCookieHeader(resultado.token, cfg.duracaoSessaoHoras),
      },
    },
  );
}
