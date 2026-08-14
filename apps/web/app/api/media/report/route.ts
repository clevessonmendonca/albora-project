import { comEvento, denunciar, ErroMidiaDeOutroEvento } from "@albora/db";
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

type Corpo = { uploadId?: unknown; motivo?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const eventoPedido = new URL(req.url).searchParams.get("evento");
  if (eventoPedido !== null && eventoPedido !== auth.session.eventoId) {
    console.warn("denuncia.evento_divergente", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
    });
    return errorResponse(403, "denuncia.evento_divergente", "Esta sessão não pertence a este evento");
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId } = parsed.data;
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  let motivo: string | null = null;
  if (parsed.data.motivo !== undefined && parsed.data.motivo !== null) {
    if (typeof parsed.data.motivo !== "string") {
      return errorResponse(422, "validation_error", "Motivo inválido", { campos: ["motivo"] });
    }
    const limpo = parsed.data.motivo.trim();
    if (limpo.length > 280) {
      return errorResponse(422, "validation_error", "Motivo longo demais", { campos: ["motivo"] });
    }
    motivo = limpo.length > 0 ? limpo : null;
  }

  try {
    const resultado = await comEvento(getPool(), auth.session.eventoId, (c) =>
      denunciar(c, { uploadId, sessaoId: auth.session.sessaoId, motivo }),
    );

    console.log("denuncia.registrada", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      uploadId,
      novaDenuncia: resultado.registrada,
    });

    return jsonOk({ registrada: resultado.registrada });
  } catch (e) {
    if (e instanceof ErroMidiaDeOutroEvento) {
      return errorResponse(404, "midia.inexistente", "Foto não encontrada");
    }
    return unexpectedError("denuncia", e);
  }
}
