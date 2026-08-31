import { annotateUpload, withEvent, eventPack } from "@albora/db";
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
import { cleanCaption, acceptedPlace } from "@/lib/details";

export const dynamic = "force-dynamic";

type DetailsBody = { uploadId?: unknown; legenda?: unknown; lugar?: unknown };

export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody<DetailsBody>(req);
  if (parsed instanceof Response) return parsed;

  const { uploadId, legenda, lugar } = parsed.data;
  if (typeof uploadId !== "string" || !UUID_RE.test(uploadId)) {
    return errorResponse(422, "validation_error", "Dados incompletos", { campos: ["uploadId"] });
  }

  try {
    const annotated = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const packId = await eventPack(c, auth.session.eventoId);

      return annotateUpload(c, {
        uploadId,
        sessionId: auth.session.sessaoId,
        caption: cleanCaption(legenda),
        place: acceptedPlace(packId, lugar),
      });
    });

    console.log("detalhes.anotado", { eventoId: auth.session.eventoId, uploadId, anotado: annotated });

    return jsonOk({ uploadId, anotado: annotated });
  } catch (e) {
    return unexpectedError("detalhes", e);
  }
}
