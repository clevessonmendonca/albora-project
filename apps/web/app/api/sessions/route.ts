import { createSession, ErroNomeInvalido } from "@albora/db";
import { parseEntryVia } from "@albora/core";
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

type Corpo = { eventoId?: unknown; nome?: unknown; consentimento?: unknown; via?: unknown };

/** QR → consentimento → nome → sessão. Não existe login — primeira foto nunca passa por autenticação (regra que decide a H1). */
export async function POST(req: Request) {
  const configError = requireConfig("sessions");
  if (configError) return configError;

  const limited = enforceRateLimit(req, null, {
    max: 60,
    message: "Muitas tentativas",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { eventoId, nome, consentimento, via: viaBruto } = parsed.data;

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
  const via = parseEntryVia(viaBruto);

  try {
    const { token, sessaoId } = await createSession(getPool(), cfg.sessionSecret, {
      eventoId,
      nome,
      consentimentoVersao: CONSENTIMENTO_VIGENTE,
      duracaoHoras: cfg.duracaoSessaoHoras,
      via,
    });

    await recordFunnelEntry(eventoId, sessaoId, via);

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
