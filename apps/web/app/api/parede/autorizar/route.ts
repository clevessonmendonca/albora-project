import { autorizarPareamento, ErroAutorizacaoDePareamento } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const VERSAO_CONSENTIMENTO_TELAO = "1";

const CODIGO = /^[A-HJ-NP-Z2-9]{6}$/;

type Corpo = { codigo?: unknown };

/**
 * Alguém que já está no evento autoriza o telão (spec 010).
 *
 * 🔴 O evento vem da **sessão de quem autoriza**, nunca do corpo nem da TV.
 * Convidado ou anfitrião serve — o crachá que sai daqui só lê o que já é
 * público, e ninguém sobe foto por ele. Sem sessão, 401: não dá para ligar o
 * telão de um evento em que você não entrou.
 */
export async function POST(req: Request) {
  const auth = await requireGuestSession(req, "Entre no evento antes de ligar o telão");
  if (auth instanceof Response) return auth;

  const limite = consume(`autorizar:${auth.rateLimitKey}`, 20, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const codigo =
    typeof parsed.data.codigo === "string" ? parsed.data.codigo.trim().toUpperCase() : "";
  if (!CODIGO.test(codigo)) {
    return errorResponse(422, "validation_error", "Código inválido", { campos: ["codigo"] });
  }

  try {
    await autorizarPareamento(
      getPool(),
      codigo,
      auth.session.eventoId,
      VERSAO_CONSENTIMENTO_TELAO,
      new Date(),
    );

    console.log("parede.pareamento_autorizado", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
    });

    return jsonOk({ autorizado: true });
  } catch (e) {
    if (e instanceof ErroAutorizacaoDePareamento) {
      console.warn("parede.autorizacao_recusada", {
        eventoId: auth.session.eventoId,
        motivo: e.motivo,
      });
      return errorResponse(409, "parede.pareamento_invalido", "Código inválido ou expirado");
    }
    return unexpectedError("parede.autorizar", e);
  }
}
