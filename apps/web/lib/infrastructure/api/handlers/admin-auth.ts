import {
  clearHostCookie,
  enforceRateLimit,
  errorResponse,
  hostCookie,
  hostTokenFromRequest,
  jsonOk,
  requireConfig,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import {
  issueMagicLink,
  revokeHostSession,
  consumeMagicLink,
} from "@/lib/application/use-cases/admin";
import { validateRequestBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { signInSchema, consumeMagicLinkSchema } from "@/lib/infrastructure/api/validators";

/** Magic link do anfitrião (spec 009): entregue só por e-mail em prod; fora de dev, link nunca volta na resposta (daria login a quem souber o e-mail); resposta idêntica com/sem conta. */
export async function postSignIn(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limit = consume(`admin_entrar:${ip.split(",")[0]!.trim()}`, 10, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const validation = await validateRequestBody(req, signInSchema);
  if (validation instanceof Response) return validation;

  try {
    const resultado = await issueMagicLink(
      {
        sessionSecret: config().sessionSecret,
        email: validation.email,
        next: validation.next,
        requestOrigin: new URL(req.url).origin,
        isDev: process.env.APP_ENV === "dev",
      },
      getPool(),
    );

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("admin.entrar", e);
  }
}

/** Sair: revoga a sessão de host no banco e apaga o cookie. */
export async function postSignOut(req: Request) {
  const limited = enforceRateLimit(req, null, {
    max: 30,
    keyPrefix: "admin_sair:",
  });
  if (limited) return limited;

  const token = hostTokenFromRequest(req);
  await revokeHostSession(
    {
      sessionSecret: config().sessionSecret,
      token,
    },
    getPool(),
  );

  return jsonOk({ ok: true }, { headers: { "set-cookie": clearHostCookie() } });
}

/** Consome magic link (token no corpo, nunca na querystring): pré-fetch de e-mail não consome o link; crachá volta em cookie `HttpOnly`. */
export async function postSession(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const limited = enforceRateLimit(req, null, {
    max: 10,
    keyPrefix: "admin_sessao:",
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const validation = await validateRequestBody(req, consumeMagicLinkSchema);
  if (validation instanceof Response) return validation;

  const resultado = await consumeMagicLink(
    {
      sessionSecret: config().sessionSecret,
      token: validation.token,
    },
    getPool(),
  );

  if (!resultado.ok) {
    return errorResponse(409, resultado.code, resultado.message);
  }

  return jsonOk(
    { ok: true },
    { headers: { "set-cookie": hostCookie(resultado.token, resultado.validadeHoras) } },
  );
}
