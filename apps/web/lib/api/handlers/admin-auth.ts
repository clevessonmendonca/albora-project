import {
  consumirMagicLink,
  emitirMagicLink,
  ErroMagicLinkInvalido,
  recordProductEvent,
  revogarHostSessao,
  VALIDADE_HOST_SESSAO_HORAS,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "@albora/db";
import {
  clearHostCookie,
  enforceRateLimit,
  errorResponse,
  hostCookie,
  hostTokenFromRequest,
  jsonOk,
  parseJsonBody,
  RATE_LIMITS,
  requireConfig,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { consume } from "@/lib/rate-limit-store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignInBody = { email?: unknown; next?: unknown };
type SessionBody = { token?: unknown };

function safeAdminNext(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const next = raw.trim();
  if (!next.startsWith("/admin")) return null;
  if (next.startsWith("//") || next.includes("://") || next.includes("\\")) return null;
  return next;
}

/** Magic link do anfitrião (spec 009): entregue só por e-mail em prod; fora de dev, link nunca volta na resposta (daria login a quem souber o e-mail); resposta idêntica com/sem conta. */
export async function postSignIn(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limit = consume(
    `admin_entrar:${ip.split(",")[0]!.trim()}`,
    RATE_LIMITS.magicLink.max,
    RATE_LIMITS.magicLink.windowSec,
    Date.now(),
  );
  if (!limit.allowed) {
    const res = errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
    const headers = new Headers(res.headers);
    headers.set("Retry-After", String(limit.resetInSeconds));
    return new Response(res.body, { status: 429, headers });
  }

  const parsed = await parseJsonBody<SignInBody>(req);
  if (parsed instanceof Response) return parsed;

  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  if (!EMAIL.test(email)) {
    return errorResponse(422, "validation_error", "E-mail inválido", { campos: ["email"] });
  }

  try {
    const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const result = await emitirMagicLink(getPool(), config().sessionSecret, email, expiresAt);
    const { token, isNewAccount } = result;
    
    if (isNewAccount) {
      void recordProductEvent(getPool(), "account_created");
    }

    const next = safeAdminNext(parsed.data.next);
    const nextQ = next ? `&next=${encodeURIComponent(next)}` : "";
    const link = `${new URL(req.url).origin}/admin/sign-in?m=${token}${nextQ}`;

    void sendHostEmail({
      to: email,
      subject: "Seu link para entrar na Albora",
      text: [
        "Para entrar no painel, abra este link (válido por poucos minutos):",
        "",
        link,
        "",
        "Se você não pediu isso, ignore este e-mail.",
      ].join("\n"),
    });

    console.log("admin.magic_link_emitido", {});

    const dev = process.env.APP_ENV === "dev";
    return jsonOk(dev ? { enviado: true, link } : { enviado: true });
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
  if (token) {
    try {
      await revogarHostSessao(getPool(), config().sessionSecret, token);
    } catch {
      // Sair é best-effort: mesmo que a revogação falhe, o cookie some.
    }
  }

  return jsonOk({ ok: true }, { headers: { "set-cookie": clearHostCookie() } });
}

/** Consome magic link (token no corpo, nunca na querystring): pré-fetch de e-mail não consome o link; crachá volta em cookie `HttpOnly`. */
export async function postSession(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const limited = enforceRateLimit(req, null, {
    ...RATE_LIMITS.consumeMagicLink,
    keyPrefix: "admin_sessao:",
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<SessionBody>(req);
  if (parsed instanceof Response) return parsed;

  const token = typeof parsed.data.token === "string" ? parsed.data.token : "";
  if (!token) {
    return errorResponse(422, "validation_error", "Link inválido", { campos: ["token"] });
  }

  try {
    const expiresAt = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 3600 * 1000);
    const session = await consumirMagicLink(
      getPool(),
      config().sessionSecret,
      token,
      expiresAt,
      new Date(),
    );

    console.log("admin.sessao_criada", { accountId: session.accountId });

    return jsonOk(
      { ok: true },
      { headers: { "set-cookie": hostCookie(session.token, VALIDADE_HOST_SESSAO_HORAS) } },
    );
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      console.warn("admin.magic_link_recusado", { motivo: e.motivo });
      return errorResponse(409, "admin.link_invalido", "Link inválido ou expirado");
    }
    return unexpectedError("admin.sessao", e);
  }
}
