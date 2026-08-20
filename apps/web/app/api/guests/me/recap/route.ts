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

/**
 * O recap pessoal do convidado (item 5 do mapa de crescimento): quantas fotos
 * a PRÓPRIA sessão mandou e quantas reações elas receberam. Reforço positivo
 * no topo de "Minhas fotos" — nunca um modal de saída, que não é confiável em
 * PWA mobile (`beforeunload`/`visibilitychange` não disparam de forma
 * garantida).
 *
 * `sessaoId` e `eventoId` vêm sempre da sessão resolvida pelo cookie, nunca
 * de entrada do cliente — o mesmo dado que a galeria de "minhas fotos" já usa
 * para se escopar à própria sessão.
 */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "recap.evento_divergente");
  if (mismatch) return mismatch;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "recap:" });
  if (limited) return limited;

  try {
    const resumo = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      // event_id no WHERE é redundante com a RLS (SET LOCAL app.event_id já
      // filtra) — mantido como segunda camada do mesmo invariante, no mesmo
      // espírito das outras consultas escopadas por sessão deste pacote.
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
