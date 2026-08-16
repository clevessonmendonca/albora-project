import {
  ehMotivoDeDenuncia,
  MOTIVO_DENUNCIA_PADRAO,
  type MotivoDeDenuncia,
} from "@albora/core";
import { comEvento, denunciar, ErroMidiaDeOutroEvento } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type Corpo = { uploadId?: unknown; motivo?: unknown; kind?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "denuncia.evento_divergente");
  if (mismatch) return mismatch;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId } = parsed.data;
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });
  }

  let kind: MotivoDeDenuncia = MOTIVO_DENUNCIA_PADRAO;
  if (parsed.data.kind !== undefined && parsed.data.kind !== null) {
    if (!ehMotivoDeDenuncia(parsed.data.kind)) {
      return errorResponse(422, "validation_error", "Motivo inválido", { campos: ["kind"] });
    }
    kind = parsed.data.kind;
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
      denunciar(c, { uploadId, sessaoId: auth.session.sessaoId, motivo, kind }),
    );

    console.log("denuncia.registrada", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      uploadId,
      kind,
      novaDenuncia: resultado.registrada,
    });

    return jsonOk({ registrada: resultado.registrada, kind });
  } catch (e) {
    if (e instanceof ErroMidiaDeOutroEvento) {
      return errorResponse(404, "midia.inexistente", "Foto não encontrada");
    }
    return unexpectedError("denuncia", e);
  }
}
