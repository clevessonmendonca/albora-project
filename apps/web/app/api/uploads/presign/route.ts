import {
  derivarChaveMidia,
  ehMimeVideo,
  podeEnviarVideo,
  validarDeclaracao,
  VALIDADE_PRESIGN_SEGUNDOS,
} from "@albora/core";
import { comEvento, contarVideosDaSessao, planoDoEvento } from "@albora/db";
import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { assinarPut } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Corpo = { uploadId?: unknown; mime?: unknown; bytes?: unknown };

export async function POST(req: Request) {
  const configError = requireConfig("presign");
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    message: "Muitas fotos de uma vez",
  });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId, mime, bytes } = parsed.data;
  if (typeof uploadId !== "string" || typeof mime !== "string" || typeof bytes !== "number") {
    return errorResponse(422, "validation_error", "Dados incompletos", {
      campos: ["uploadId", "mime", "bytes"],
    });
  }

  const invalido = validarDeclaracao(mime, bytes);
  if (invalido) return errorResponse(422, invalido.code, "Arquivo recusado", invalido.details);

  if (ehMimeVideo(mime)) {
    const cota = await comEvento(getPool(), auth.session.eventoId, async (c) => {
      const plano = await planoDoEvento(c, auth.session.eventoId);
      const enviados = await contarVideosDaSessao(c, auth.session.eventoId, auth.session.sessaoId);
      return { plano, enviados };
    });

    if (!podeEnviarVideo(cota.plano, cota.enviados)) {
      return errorResponse(403, "video.cota_esgotada", "Limite de vídeos atingido para este convidado");
    }
  }

  const chave = derivarChaveMidia(auth.session.eventoId, uploadId, "full").replace(/\/full$/, "");

  try {
    const full = await assinarPut(`${chave}/full`, mime, VALIDADE_PRESIGN_SEGUNDOS);
    const thumb = ehMimeVideo(mime)
      ? await assinarPut(`${chave}/thumb`, "image/jpeg", VALIDADE_PRESIGN_SEGUNDOS)
      : await assinarPut(`${chave}/thumb`, mime, VALIDADE_PRESIGN_SEGUNDOS);

    console.log("presign.emitido", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      chave,
      bytes,
    });

    return jsonOk({
      uploadId,
      chave,
      full,
      thumb,
      expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
    });
  } catch (e) {
    return unexpectedError("presign.assinar", e);
  }
}
