import {
  bloquearConvidado,
  comEvento,
  ErroSessaoDeOutroEvento,
} from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Corpo = { sessaoId?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    return errorResponse(403, "bloqueio.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const limited = enforceRateLimit(req, auth.session, { max: 30 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const alvo =
    typeof parsed.data.sessaoId === "string" && UUID_RE.test(parsed.data.sessaoId)
      ? parsed.data.sessaoId
      : null;
  if (!alvo) {
    return errorResponse(422, "validation_error", "Sessão inválida", { campos: ["sessaoId"] });
  }

  if (alvo === auth.session.sessaoId) {
    return errorResponse(422, "bloqueio.proprio", "Não é possível bloquear a si");
  }

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, (c) =>
      bloquearConvidado(c, {
        eventoId: auth.session.eventoId,
        bloqueadorId: auth.session.sessaoId,
        bloqueadoId: alvo,
      }),
    );

    console.log("bloqueio.registrado", {
      eventoId: auth.session.eventoId,
      bloqueadorId: auth.session.sessaoId,
      novo: resultado.registrado,
    });

    return jsonOk({ registrado: resultado.registrado });
  } catch (e) {
    if (e instanceof ErroSessaoDeOutroEvento) {
      return errorResponse(404, "bloqueio.sessao_ausente", "Convidado não encontrado");
    }
    return unexpectedError("bloqueio", e);
  }
}
