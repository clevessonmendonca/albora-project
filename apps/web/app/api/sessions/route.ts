import { criarSessao, ErroNomeInvalido } from "@albora/db";
import { recordFunnelEntry } from "@/features/guest/lib/record-funnel";
import {
  sessionCookieHeader,
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

const CONSENTIMENTO_VIGENTE = "v1";

type Corpo = { eventoId?: unknown; nome?: unknown; consentimento?: unknown };

/**
 * Terceiro toque do fluxo: QR → consentimento → nome → sessão.
 *
 * Não existe login aqui nem em lugar nenhum. A primeira foto nunca passa por
 * loja de aplicativos nem por tela de autenticação — é a regra que decide a
 * H1, e a H1 decide se o negócio existe.
 */
export async function POST(req: Request) {
  const configError = requireConfig("sessions");
  if (configError) return configError;

  const limited = enforceRateLimit(req, null, {
    max: 10,
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { eventoId, nome, consentimento } = parsed.data;

  if (typeof eventoId !== "string" || typeof nome !== "string") {
    return errorResponse(422, "validation_error", "Dados incompletos", {
      campos: ["eventoId", "nome"],
    });
  }

  if (consentimento !== CONSENTIMENTO_VIGENTE) {
    return errorResponse(422, "consentimento.ausente", "Consentimento necessário", {
      versao_vigente: CONSENTIMENTO_VIGENTE,
    });
  }

  const cfg = config();

  try {
    const { token, sessaoId } = await criarSessao(getPool(), cfg.sessionSecret, {
      eventoId,
      nome,
      consentimentoVersao: CONSENTIMENTO_VIGENTE,
      duracaoHoras: cfg.duracaoSessaoHoras,
    });

    await recordFunnelEntry(eventoId, sessaoId);

    console.log("sessao.criada", { eventoId, sessaoId });

    return jsonOk(
      { sessaoId },
      { status: 201, headers: { "set-cookie": sessionCookieHeader(token, cfg.duracaoSessaoHoras) } },
    );
  } catch (e) {
    if (e instanceof ErroNomeInvalido) {
      return errorResponse(422, e.code, "Nome obrigatório", { max: 40 });
    }
    return unexpectedError("sessions.criar", e);
  }
}
