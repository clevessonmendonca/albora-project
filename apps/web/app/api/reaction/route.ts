import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
  enforceRateLimit,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import {
  listReactions,
  addReaction,
  removeReaction,
} from "@/lib/application/use-cases/guest";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import {
  listReactionsSchema,
  addReactionSchema,
  removeReactionSchema,
} from "@/lib/infrastructure/api/validators";

export const dynamic = "force-dynamic";

const TIPO_PADRAO = "estrela";

async function validarSessao(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "reacao.evento_divergente",
  );
  if (mismatch) return mismatch;

  return auth;
}

export async function GET(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const query = Object.fromEntries(new URL(req.url).searchParams);
  const validated = validateBody(query, listReactionsSchema);
  if (validated instanceof Response) return validated;

  try {
    const result = await listReactions(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        uploadId: validated.uploadId,
      },
      () => getPool().connect(),
    );
    return jsonOk({ reatores: result.reatores });
  } catch (e) {
    return unexpectedError("reacao.get", e);
  }
}

export async function PUT(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validated = validateBody(parsed.data, addReactionSchema);
  if (validated instanceof Response) return validated;

  const tipo = validated.tipo || TIPO_PADRAO;

  try {
    const resultado = await addReaction(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        uploadId: validated.uploadId,
        tipo,
      },
      () => getPool().connect(),
    );

    if (!resultado.ok) {
      const status = resultado.code === "reacao.evento_ausente" ? 403 : 422;
      return errorResponse(status, resultado.code, "Reação recusada");
    }

    return jsonOk({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return unexpectedError("reacao.put", e);
  }
}

export async function DELETE(req: Request) {
  const auth = await validarSessao(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validated = validateBody(parsed.data, removeReactionSchema);
  if (validated instanceof Response) return validated;

  try {
    const resultado = await removeReaction(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        uploadId: validated.uploadId,
      },
      () => getPool().connect(),
    );

    if (!resultado.ok)
      return errorResponse(403, resultado.code, "Reação recusada");

    return jsonOk({ reacoes: resultado.reacoes, minha: resultado.minha });
  } catch (e) {
    return unexpectedError("reacao.delete", e);
  }
}
