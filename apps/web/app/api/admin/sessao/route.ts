import { consumirMagicLink, ErroMagicLinkInvalido, VALIDADE_HOST_SESSAO_HORAS } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { cookieDoHost } from "@/lib/host-sessao";
import { erro, erroInesperado } from "@/lib/resposta";

export const dynamic = "force-dynamic";

type Corpo = { token?: unknown };

/**
 * Consome o magic link e abre a sessão de host (spec 009).
 *
 * O token chega no **corpo** de um POST — nunca na querystring, que o guard
 * `sessao` reprova. A página `/admin/entrar?m=…` lê o `m` e o manda aqui quando
 * o anfitrião confirma, o que também evita que o pré-fetch de um cliente de
 * e-mail consuma o link sozinho. O crachá volta em cookie `HttpOnly`.
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

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return erro(422, "validation_error", "Corpo inválido", { campo: "body" });
  }

  const token = typeof corpo.token === "string" ? corpo.token : "";
  if (!token) return erro(422, "validation_error", "Link inválido", { campos: ["token"] });

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 3600 * 1000);
    const sessao = await consumirMagicLink(banco(), config().sessionSecret, token, expiraEm, new Date());

    console.log("admin.sessao_criada", { accountId: sessao.accountId });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "set-cookie": cookieDoHost(sessao.token, VALIDADE_HOST_SESSAO_HORAS),
      },
    });
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      console.warn("admin.magic_link_recusado", { motivo: e.motivo });
      return erro(409, "admin.link_invalido", "Link inválido ou expirado");
    }
    return erroInesperado("admin.sessao", e);
  }
}
