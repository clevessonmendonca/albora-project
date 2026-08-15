import {
  buildGuestbookScreen,
  decideDelivery,
  guestbookScreenHasContent,
  type GuestbookEntry,
} from "@albora/core";
import {
  guestbookReads,
  markGuestbookRead,
  eventGuestbook,
  withEvent,
} from "@albora/db";
import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function screenPayload(
  recado: GuestbookEntry | null,
  sessaoId: string,
  eventoId: string,
  leituras: Awaited<ReturnType<typeof guestbookReads>>,
) {
  const entrega = decideDelivery(recado, { id: sessaoId, eventoId }, leituras, new Date());
  const tela = buildGuestbookScreen(entrega, "indisponivel");
  return {
    mostrar: entrega.mostrar && guestbookScreenHasContent(tela),
    codigo: entrega.codigo,
    tela: { texto: tela.texto, camera: tela.camera },
  };
}

/**
 * O convidado le o recado do evento da sessao dele. Nada alem — em
 * particular, nao autoriza gravar. Se o recado nao carregar, a resposta
 * e vazia e a camera continua livre.
 */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "recado:" });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "recado.evento_divergente");
  if (mismatch) return mismatch;

  try {
    const corpo = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const recado = await eventGuestbook(c, auth.session.eventoId);
      const leituras = await guestbookReads(c, auth.session.eventoId, auth.session.sessaoId);
      return screenPayload(recado, auth.session.sessaoId, auth.session.eventoId, leituras);
    });

    return jsonOk(corpo);
  } catch (e) {
    return unexpectedError("recado.get", e);
  }
}

/**
 * Marca o recado como lido para esta sessao. O id do recado sai do evento
 * da sessao, nunca do corpo — mandar um id de outra festa nao troca de
 * evento.
 */
export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { max: 60, keyPrefix: "recado:" });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "recado.evento_divergente");
  if (mismatch) return mismatch;

  try {
    const agora = new Date();
    const resultado = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const recado = await eventGuestbook(c, auth.session.eventoId);
      const leituras = await guestbookReads(c, auth.session.eventoId, auth.session.sessaoId);
      const entrega = decideDelivery(
        recado,
        { id: auth.session.sessaoId, eventoId: auth.session.eventoId },
        leituras,
        agora,
      );

      if (!entrega.mostrar || entrega.recado === null) {
        return { lido: entrega.codigo === "recado.ja_lido", codigo: entrega.codigo };
      }

      await markGuestbookRead(c, {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        recadoId: entrega.recado.id,
        lidoEm: agora,
      });

      return { lido: true, codigo: "recado.ja_lido" };
    });

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("recado.post", e);
  }
}
