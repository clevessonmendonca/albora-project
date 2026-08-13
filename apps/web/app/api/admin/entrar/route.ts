import { emitirMagicLink, VALIDADE_MAGIC_LINK_MINUTOS } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Corpo = { email?: unknown };

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
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limite = consume(`admin_entrar:${ip.split(",")[0]!.trim()}`, 10, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const email = typeof corpo.email === "string" ? corpo.email.trim() : "";
  if (!EMAIL.test(email)) {
    return errorResponse(422, "validation_error", "E-mail inválido", { campos: ["email"] });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const { token } = await emitirMagicLink(getPool(), config().sessionSecret, email, expiraEm);
    const link = `${new URL(req.url).origin}/admin/sign-in?m=${token}`;

    console.log("admin.magic_link_emitido", {});

    const dev = process.env.APP_ENV === "dev";
    return jsonOk(dev ? { enviado: true, link } : { enviado: true });
  } catch (e) {
    return unexpectedError("admin.entrar", e);
  }
}
