import {
  canUploadVideo,
  deriveMediaKey,
  isVideoMime,
  logger,
  metrics,
  validateDeclaration,
  VALIDADE_PRESIGN_SEGUNDOS,
} from "@albora/core";
import { withEvent, contarVideosDaSessao, planoDoEvento } from "@albora/db";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  RATE_LIMITS,
  requireConfig,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { assinarPut } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Body = { uploadId?: unknown; mime?: unknown; bytes?: unknown };

export async function POST(req: Request) {
  const configError = requireConfig("presign");
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    ...RATE_LIMITS.upload,
    message: "Muitas fotos de uma vez",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId, mime, bytes } = parsed.data;
  if (typeof uploadId !== "string" || typeof mime !== "string" || typeof bytes !== "number") {
    return errorResponse(422, "validation_error", "Dados incompletos", {
      campos: ["uploadId", "mime", "bytes"],
    });
  }

  const invalid = validateDeclaration(mime, bytes);
  if (invalid) return errorResponse(422, invalid.code, "Arquivo recusado", invalid.details);

  if (isVideoMime(mime)) {
    const quota = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const plan = await planoDoEvento(c, auth.session.eventoId);
      const uploaded = await contarVideosDaSessao(c, auth.session.eventoId, auth.session.sessaoId);
      return { plan, uploaded };
    });

    if (!canUploadVideo(quota.plan, quota.uploaded)) {
      return errorResponse(403, "video.cota_esgotada", "Limite de vídeos atingido para este convidado");
    }
  }

  const key = deriveMediaKey(auth.session.eventoId, uploadId, "full").replace(/\/full$/, "");

  try {
    const full = await assinarPut(`${key}/full`, mime, VALIDADE_PRESIGN_SEGUNDOS);
    const thumb = isVideoMime(mime)
      ? await assinarPut(`${key}/thumb`, "image/jpeg", VALIDADE_PRESIGN_SEGUNDOS)
      : await assinarPut(`${key}/thumb`, mime, VALIDADE_PRESIGN_SEGUNDOS);

    logger.info({ eventId: auth.session.eventoId, bytes }, "presign.emitido");
    metrics.increment("upload.started");

    await recordFunnelEvent(auth.session.eventoId, auth.session.sessaoId, "upload_start");

    return jsonOk({
      uploadId,
      chave: key,
      full,
      thumb,
      expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
    });
  } catch (e) {
    return unexpectedError("presign.assinar", e);
  }
}
