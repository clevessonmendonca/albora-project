import { emitirMagicLink, VALIDADE_MAGIC_LINK_MINUTOS } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Corpo = { email?: unknown };

/**
 * O anfitrião pede um magic link (spec 009).
 *
 * O token vira um link `/admin/entrar?m=…` e é **entregue por e-mail** — o único
 * canal em produção. Em dev não há e-mail: a rota devolve o link no corpo,
 * atrás de `APP_ENV=dev`, para o desenvolvedor clicar. Fora de dev, o link
 * **nunca** volta na resposta: devolvê-lo a um POST anônimo seria dar login de
 * qualquer conta a quem souber o e-mail.
 *
 * A resposta é a mesma tenha ou não a conta — "se existe, enviamos" — para não
 * virar um oráculo de quais e-mails têm conta.
 */
export async function POST(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("admin.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  const limite = consumir(`admin_entrar:${ip.split(",")[0]!.trim()}`, 10, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const email = typeof corpo.email === "string" ? corpo.email.trim() : "";
  if (!EMAIL.test(email)) {
    return erro(422, "validation_error", "E-mail inválido", { campos: ["email"] });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
    const { token } = await emitirMagicLink(banco(), config().sessionSecret, email, expiraEm);
    const link = `${new URL(req.url).origin}/admin/entrar?m=${token}`;

    // Nunca logar o e-mail (PII) nem o token (credencial): só que houve pedido.
    console.log("admin.magic_link_emitido", {});

    const dev = process.env.APP_ENV === "dev";
    return ok(dev ? { enviado: true, link } : { enviado: true });
  } catch (e) {
    return erroInesperado("admin.entrar", e);
  }
}
