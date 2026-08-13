import { comEvento, removerUploadProprio } from "@albora/db";
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

type Corpo = { uploadId?: unknown };

export async function DELETE(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60 });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const uploadId =
    typeof parsed.data.uploadId === "string" && UUID_RE.test(parsed.data.uploadId)
      ? parsed.data.uploadId
      : null;
  if (!uploadId) return errorResponse(422, "validation_error", "Foto inválida", { campos: ["uploadId"] });

  try {
    const removido = await comEvento(getPool(), auth.session.eventoId, (c) =>
      removerUploadProprio(c, uploadId, auth.session.sessaoId),
    );

    if (!removido) return errorResponse(403, "upload.remover_negado", "Não foi possível remover esta foto");

    return jsonOk({ uploadId, removido: true });
  } catch (e) {
    return unexpectedError("upload.remover", e);
  }
}
