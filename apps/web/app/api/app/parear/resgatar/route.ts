import { ErroResgateDePareamento, resgatarCodigoPareamentoApp } from "@albora/db";
import {
  sessionCookieHeader,
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseFourDigitCode,
  parseJsonBody,
  requireConfig,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

type Corpo = { codigo?: unknown };

/**
 * O app instalado digita o codigo e recebe a sessao da web (spec A-11).
 *
 * Sem sessao previa: o codigo *é* a credencial. Resposta traz slug e sessaoId;
 * o token vai no cookie HttpOnly (e no corpo para o cliente nativo).
 */
export async function POST(req: Request) {
  const configError = requireConfig("app.parear.resgatar", { log: false });
  if (configError) return configError;

  const limited = enforceRateLimit(req, null, {
    max: 20,
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const codigo = parseFourDigitCode(parsed.data.codigo);
  if (codigo instanceof Response) return codigo;

  const cfg = config();

  try {
    const resgatado = await resgatarCodigoPareamentoApp(
      getPool(),
      cfg.sessionSecret,
      codigo,
      cfg.duracaoSessaoHoras,
      new Date(),
    );

    console.log("app.pareamento_resgatado", {
      eventoId: resgatado.eventoId,
      sessaoId: resgatado.sessaoId,
    });

    return jsonOk(
      { slug: resgatado.slug, sessaoId: resgatado.sessaoId },
      {
        headers: {
          "set-cookie": sessionCookieHeader(resgatado.token, cfg.duracaoSessaoHoras),
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
