import { metrics } from "@albora/core";
import { recordFunnelEvent } from "@/features/guest/lib/record-funnel";
import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  RATE_LIMITS,
  requireConfig,
  requireGuestSession,
  unexpectedError,
  enforceRateLimit,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { inspecionarObjeto } from "@/lib/r2";
import { confirmUpload } from "@/lib/application/use-cases/guest";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { confirmUploadSchema } from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const configError = requireConfig("confirm");
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    ...RATE_LIMITS.upload,
    message: "Muitas fotos de uma vez",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validated = validateBody(parsed.data, confirmUploadSchema);
  if (validated instanceof Response) return validated;

  try {
    // Inspecionar objetos no R2 (infraestrutura)
    const objeto = await inspecionarObjeto(`${validated.chave}/full`);
    if (!objeto) {
      return errorResponse(
        409,
        "upload.objeto_ausente",
        "O arquivo ainda não chegou",
        {
          chave: `${validated.chave}/full`,
        },
      );
    }

    const thumb = await inspecionarObjeto(`${validated.chave}/thumb`);
    if (!thumb) {
      return errorResponse(
        409,
        "upload.thumb_ausente",
        "A miniatura ainda não chegou",
        {
          chave: `${validated.chave}/thumb`,
        },
      );
    }

    // Delegar validações e confirmação ao use case
    const resultado = await confirmUpload(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        uploadId: validated.uploadId,
        chave: validated.chave,
        mime: validated.mime,
        bytes: objeto.bytes,
        inicio: objeto.inicio,
        thumbBytes: thumb.bytes,
        thumbInicio: thumb.inicio,
        legenda: validated.legenda,
        lugar: validated.lugar,
        desafioId: validated.desafioId,
        promptKey: validated.promptKey,
        capturadaEm: validated.capturadaEm,
        capturadaEmParede: validated.capturadaEmParede,
        largura: validated.largura,
        altura: validated.altura,
        story: validated.story,
        musicTrackId: validated.musicTrackId,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const status = resultado.code === "upload.chave_invalida" ? 403 : 422;
      return errorResponse(
        status,
        resultado.code,
        resultado.message,
        resultado.details,
      );
    }

    if (resultado.estado === "criado") {
      await recordFunnelEvent(
        auth.session.eventoId,
        auth.session.sessaoId,
        "upload_ok",
      );
      metrics.increment("upload.confirmed");
    }

    return jsonOk({ uploadId: resultado.uploadId, estado: resultado.estado });
  } catch (e) {
    return unexpectedError("confirm", e);
  }
}
