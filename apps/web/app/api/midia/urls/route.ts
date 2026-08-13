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
import { recusado, validarLote, VALIDADE_GET_SEGUNDOS } from "./lote";

export const dynamic = "force-dynamic";

type Corpo = { chaves?: unknown };

export async function POST(req: Request) {
  const configError = requireConfig("midia", { mediaOrigin: true });
  if (configError) return configError;

  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "midia:" });
  if (limited) return limited;

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const lote = validarLote(parsed.data.chaves, auth.session.eventoId);

  if (recusado(lote)) {
    if (lote.status === 403) {
      console.warn("midia.chave_recusada", {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
      });
    }
    return errorResponse(lote.status, lote.code, lote.message, lote.details);
  }

  try {
    const expiraEm = Date.now() + VALIDADE_GET_SEGUNDOS * 1000;

    const urls = await Promise.all(
      lote.chaves.map(async (chave) => ({
        chave,
        url: await assinarGet(chave, VALIDADE_GET_SEGUNDOS),
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
