import { podeUsarTelao } from "@albora/core";
import { autorizarPareamento, withEvent, ErroAutorizacaoDePareamento, planoDoEvento } from "@albora/db";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  requireHostEventRole,
  requireHostSession,
  ADMIN_SESSION_REQUIRED,
  ANY_HOST_ROLES,
  UUID_RE,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

const WALL_CONSENT_VERSION = "1";

const PAIRING_CODE = /^[A-HJ-NP-Z2-9]{6}$/;

type Body = { codigo?: unknown; eventoId?: unknown };

type Autor = { eventoId: string; sessaoId: string | null; limiteKey: string };

async function autorDoHost(req: Request, eventoId: string): Promise<Autor | Response> {
  if (!UUID_RE.test(eventoId)) {
    return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
  }
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;
  const owned = await requireHostEventRole(auth.host.accountId, eventoId, ANY_HOST_ROLES);
  if (owned instanceof Response) return owned;
  return { eventoId, sessaoId: null, limiteKey: `host:${auth.host.accountId}` };
}

/** Autoriza telão (spec 010): o evento sai de quem autoriza, nunca do código — sessão de convidado ou, com `eventoId`, sessão de anfitrião com papel no evento; crachá só lê público; sem sessão → 401; plano grátis recusado aqui, nunca paywall na pista. */
export async function POST(req: Request) {
  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  let autor: Autor | Response;
  if (typeof parsed.data.eventoId === "string" && parsed.data.eventoId) {
    autor = await autorDoHost(req, parsed.data.eventoId);
  } else {
    const auth = await requireGuestSession(req, "Entre no evento antes de ligar o telão");
    autor =
      auth instanceof Response
        ? auth
        : {
            eventoId: auth.session.eventoId,
            sessaoId: auth.session.sessaoId,
            limiteKey: auth.rateLimitKey,
          };
  }
  if (autor instanceof Response) return autor;

  const limit = consume(`autorizar:${autor.limiteKey}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const codigo =
    typeof parsed.data.codigo === "string" ? parsed.data.codigo.trim().toUpperCase() : "";
  if (!PAIRING_CODE.test(codigo)) {
    return errorResponse(422, "validation_error", "Código inválido", { campos: ["codigo"] });
  }

  try {
    const plan = await withEvent(getPool(), autor.eventoId, (c) =>
      planoDoEvento(c, autor.eventoId),
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
      autor.eventoId,
      WALL_CONSENT_VERSION,
      new Date(),
    );

    console.log("parede.pareamento_autorizado", {
      eventoId: autor.eventoId,
      sessaoId: autor.sessaoId,
    });

    return jsonOk({ autorizado: true });
  } catch (e) {
    if (e instanceof ErroAutorizacaoDePareamento) {
      console.warn("parede.autorizacao_recusada", {
        eventoId: autor.eventoId,
        motivo: e.motivo,
      });
      return errorResponse(409, "parede.pareamento_invalido", "Código inválido ou expirado");
    }
    return unexpectedError("parede.autorizar", e);
  }
}
