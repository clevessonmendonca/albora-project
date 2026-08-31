import { withEvent } from "@albora/db";
import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Recap pessoal: fotos e reações da própria sessão (cookie, nunca do cliente) — sem modal de saída (não confiável em PWA mobile). */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "recap.evento_divergente");
  if (mismatch) return mismatch;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "recap:" });
  if (limited) return limited;

  try {
    const resumo = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      // event_id no WHERE é redundante com a RLS — mantido como segunda camada do mesmo invariante.
      const { rows } = await c.query<{ fotos: number; curtidas: number }>(
        `SELECT
            count(DISTINCT u.id)::int AS fotos,
            count(r.upload_id)::int  AS curtidas
           FROM uploads u
           LEFT JOIN reactions r ON r.upload_id = u.id
          WHERE u.event_id = $1
            AND u.session_id = $2
            AND u.state <> 'removed'`,
        [auth.session.eventoId, auth.session.sessaoId],
      );
      return rows[0] ?? { fotos: 0, curtidas: 0 };
    });

    return jsonOk({ fotos: resumo.fotos, curtidas: resumo.curtidas });
  } catch (e) {
    return unexpectedError("recap.pessoal", e);
  }
}
