import {
  enforceRateLimit,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { assinarGet } from "@/lib/r2";
import { isRejected, validateBatch, GET_TTL_SECONDS } from "./lote";

export const dynamic = "force-dynamic";

type Body = { chaves?: unknown };

export async function POST(req: Request) {
  const configError = requireConfig("midia", { mediaOrigin: true });
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "midia:" });
  if (limited) return limited;

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const batch = validateBatch(parsed.data.chaves, auth.session.eventoId);

  if (isRejected(batch)) {
    if (batch.status === 403) {
      console.warn("midia.chave_recusada", {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
      });
    }
    return errorResponse(batch.status, batch.code, batch.message, batch.details);
  }

  try {
    const expiraEm = Date.now() + GET_TTL_SECONDS * 1000;

    const urls = await Promise.all(
      batch.chaves.map(async (chave) => ({
        chave,
        url: await assinarGet(chave, GET_TTL_SECONDS),
        expiraEm,
      })),
    );

    console.log("midia.urls_emitidas", {
      eventoId: auth.session.eventoId,
      sessaoId: auth.session.sessaoId,
      quantidade: urls.length,
    });

    return jsonOk({ urls });
  } catch (e) {
    return unexpectedError("midia.urls", e);
  }
}
