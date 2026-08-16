import {
  consumirMagicLink,
  emitirMagicLink,
  ErroMagicLinkInvalido,
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

/**
 * O anfitrião pede um magic link (spec 009).
 *
 * O token vira um link `/admin/sign-in?m=…` e é **entregue por e-mail** — o único
 * canal em produção. Em dev não há e-mail: a rota devolve o link no corpo,
 * atrás de `APP_ENV=dev`, para o desenvolvedor clicar. Fora de dev, o link
 * **nunca** volta na resposta: devolvê-lo a um POST anônimo seria dar login de
 * qualquer conta a quem souber o e-mail.
 *
 * A resposta é a mesma tenha ou não a conta — "se existe, enviamos" — para não
 * virar um oráculo de quais e-mails têm conta.
 */
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

  const parsed = await parseJsonBody<SignInBody>(req);
  if (parsed instanceof Response) return parsed;

  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  if (!EMAIL.test(email)) {
    return errorResponse(422, "validation_error", "E-mail inválido", { campos: ["email"] });
  }

  try {
    const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const { token } = await emitirMagicLink(getPool(), config().sessionSecret, email, expiresAt);
    const next = safeAdminNext(parsed.data.next);
    const nextQ = next ? `&next=${encodeURIComponent(next)}` : "";
    const link = `${new URL(req.url).origin}/admin/sign-in?m=${token}${nextQ}`;

    // Fora do caminho crítico de sábado: falha de e-mail não revela se a conta
    // existe. Em dev devolvemos o link para o anfitrião clicar sem Resend.
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

/**
 * Consome o magic link e abre a sessão de host (spec 009).
 *
 * O token chega no **corpo** de um POST — nunca na querystring, que o guard
 * `sessao` reprova. A página `/admin/sign-in?m=…` lê o `m` e o manda aqui quando
 * o anfitrião confirma, o que também evita que o pré-fetch de um cliente de
 * e-mail consuma o link sozinho. O crachá volta em cookie `HttpOnly`.
 */
export async function postSession(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const limited = enforceRateLimit(req, null, {
    max: 10,
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
