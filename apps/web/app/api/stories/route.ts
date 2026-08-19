import { comEvento, storiesAtivasDoEvento, thumbKeyFromFull } from "@albora/db";
import {
  enforceRateLimit,
  jsonOk,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Stories ativas do evento da sessão — o rail da Home, nunca o feed.
 *
 * Sem gate de interação: mostrar story antes do gate é espelho (CLAUDE.md,
 * "A interação abre por gate"), a mesma regra que já libera o feed em modo
 * `espelho`. `storiesAtivasDoEvento` já filtra pela janela de 24h; aqui só
 * serializa para a rede com o mínimo que a tira precisa — `autor` é o
 * primeiro nome que a consulta devolve (concessão `ler.identidade`), nunca
 * mais que isso.
 */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "stories:" });
  if (limited) return limited;

  try {
    const stories = await comEvento(getPool(), auth.session.eventoId, (c) =>
      storiesAtivasDoEvento(c, auth.session.eventoId),
    );

    return jsonOk({
      itens: stories.map((s) => ({
        id: s.id,
        autor: s.autor,
        chaveThumb: thumbKeyFromFull(s.storageKey),
      })),
    });
  } catch (e) {
    return unexpectedError("stories", e);
  }
}
