import { podeUsarTelao } from "@albora/core";
import { autorizarPareamento, withEvent, ErroAutorizacaoDePareamento, planoDoEvento } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

const WALL_CONSENT_VERSION = "1";

const PAIRING_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

type Body = { codigo?: unknown };

/** Autoriza telão (spec 010): evento da sessão de quem autoriza, nunca do corpo; crachá só lê público; sem sessão → 401; plano grátis recusado aqui, nunca paywall na pista. */
export async function POST(req: Request) {
  const auth = await requireGuestSession(req, "Entre no evento antes de ligar o telão");
  if (auth instanceof Response) return auth;

  const limit = consume(`autorizar:${auth.rateLimitKey}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const codigo =
    typeof parsed.data.codigo === "string" ? parsed.data.codigo.trim().toUpperCase() : "";
  if (!PAIRING_CODE.test(codigo)) {
    return errorResponse(422, "validation_error", "Código inválido", { campos: ["codigo"] });
  }

  try {
    const plan = await withEvent(getPool(), auth.session.eventoId, (c) =>
      planoDoEvento(c, auth.session.eventoId),
    );
    if (!podeUsarTelao(plan)) {
      return errorResponse(
        403,
        "plano.telao",
        "O telão entra no plano Completo. No painel do anfitrião dá para subir de plano sem travar a festa.",
      );
    }

    await autorizarPareamento(
      getPool(),
      codigo,
      auth.session.eventoId,
      WALL_CONSENT_VERSION,
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
