import { consumirMagicLink, ErroMagicLinkInvalido, VALIDADE_HOST_SESSAO_HORAS } from "@albora/db";
import {
  hostCookie,
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

type Corpo = { token?: unknown };

/**
 * Consome o magic link e abre a sessão de host (spec 009).
 *
 * O token chega no **corpo** de um POST — nunca na querystring, que o guard
 * `sessao` reprova. A página `/admin/sign-in?m=…` lê o `m` e o manda aqui quando
 * o anfitrião confirma, o que também evita que o pré-fetch de um cliente de
 * e-mail consuma o link sozinho. O crachá volta em cookie `HttpOnly`.
 */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const limited = enforceRateLimit(req, null, {
    max: 10,
    keyPrefix: "admin_sessao:",
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;
  const corpo = parsed.data;

  const token = typeof corpo.token === "string" ? corpo.token : "";
  if (!token) {
    return errorResponse(422, "validation_error", "Link inválido", { campos: ["token"] });
  }

  try {
    const expiraEm = new Date(Date.now() + VALIDADE_HOST_SESSAO_HORAS * 3600 * 1000);
    const sessao = await consumirMagicLink(getPool(), config().sessionSecret, token, expiraEm, new Date());

    console.log("admin.sessao_criada", { accountId: sessao.accountId });

    return jsonOk(
      { ok: true },
      { headers: { "set-cookie": hostCookie(sessao.token, VALIDADE_HOST_SESSAO_HORAS) } },
    );
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      console.warn("admin.magic_link_recusado", { motivo: e.motivo });
      return errorResponse(409, "admin.link_invalido", "Link inválido ou expirado");
    }
    return unexpectedError("admin.sessao", e);
  }
}
