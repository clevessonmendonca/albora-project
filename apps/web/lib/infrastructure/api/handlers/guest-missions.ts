/**
 * API Handler: Guest Missions (GET)
 * 
 * Camada HTTP que delega para o use case.
 */

import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { listGuestMissions } from "@/lib/application/use-cases/guest";

export type MissaoResposta = {
  id: string;
  titulo: string;
  emoji: string | null;
  feito: boolean;
};

export type MissoesResposta = {
  missoes: MissaoResposta[];
};

/**
 * Lista as missões disponíveis para o convidado.
 * 
 * Fluxo:
 * 1. Autenticação (requireGuestSession)
 * 2. Rate limiting (enforceRateLimit)
 * 3. Validação de evento (rejectGuestEventQueryMismatch)
 * 4. Delegação para use case
 * 5. Serialização da resposta (jsonOk)
 */
export async function GET(req: Request): Promise<Response> {
  // 1. Autenticação
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  // 2. Rate limiting
  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  // 3. Validação de evento
  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "missoes.evento_divergente");
  if (mismatch) return mismatch;

  try {
    // 4. Use case (lógica de aplicação)
    const result = await listGuestMissions(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
      },
      getPool(),
    );

    // 5. Serialização
    return jsonOk({ missoes: result.missoes } satisfies MissoesResposta);
  } catch (e) {
    return unexpectedError("missoes.guest", e);
  }
}
