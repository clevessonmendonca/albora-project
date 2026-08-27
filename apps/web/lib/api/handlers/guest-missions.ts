import { withEvent, listChallenges, packDoEvento } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export type MissaoResposta = {
  id: string;
  titulo: string;
  feito: boolean;
};

export type MissoesResposta = {
  missoes: MissaoResposta[];
};

export async function GET(req: Request): Promise<Response> {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session);
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "missoes.evento_divergente");
  if (mismatch) return mismatch;

  try {
    const { desafios, packId } = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const [d, p] = await Promise.all([
        listChallenges(c, auth.session.eventoId, auth.session.sessaoId),
        packDoEvento(c, auth.session.eventoId),
      ]);
      return { desafios: d, packId: p };
    });

    const pack = packId ? (PACKS[packId] ?? null) : null;

    const missoes: MissaoResposta[] = desafios.map((d) => {
      const titulo =
        d.tituloCustom ??
        (pack && d.chaveTitulo ? resolvePackText(pack, d.chaveTitulo) : (d.chaveTitulo ?? ""));
      return { id: d.id, titulo, feito: d.feito };
    });

    return jsonOk({ missoes } satisfies MissoesResposta);
  } catch (e) {
    return unexpectedError("missoes.guest", e);
  }
}
