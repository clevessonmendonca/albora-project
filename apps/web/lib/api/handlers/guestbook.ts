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
import { signGuestbookAudio } from "./guestbook-audio-url";

export const dynamic = "force-dynamic";

async function screenPayload(
  recado: GuestbookEntry | null,
  sessaoId: string,
  eventoId: string,
  leituras: Awaited<ReturnType<typeof guestbookReads>>,
) {
  const entrega = decideDelivery(recado, { id: sessaoId, eventoId }, leituras, new Date());
  const estadoDoAudio = entrega.recado?.audio ? "disponivel" : "indisponivel";
  const tela = buildGuestbookScreen(entrega, estadoDoAudio);
  const audio = await signGuestbookAudio(tela.audio);
  return {
    mostrar: entrega.mostrar && guestbookScreenHasContent(tela),
    codigo: entrega.codigo,
    tela: { texto: tela.texto, camera: tela.camera, audio },
  };
}

/** Convidado lê o recado do evento da sessão — não autoriza gravar; recado sem carregar = resposta vazia, câmera segue. */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "recado:" });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(req, auth.session, "recado.evento_divergente");
  if (mismatch) return mismatch;

  try {
    const { recado, leituras } = await withEvent(getPool(), auth.session.eventoId, async (c) => {
      const recado = await eventGuestbook(c, auth.session.eventoId);
      const leituras = await guestbookReads(c, auth.session.eventoId, auth.session.sessaoId);
      return { recado, leituras };
    });
    const corpo = await screenPayload(recado, auth.session.sessaoId, auth.session.eventoId, leituras);

    return jsonOk(corpo);
  } catch (e) {
    return unexpectedError("recado.get", e);
  }
}

/** Marca recado como lido: id sai do evento da sessão, nunca do corpo — id de outra festa não troca de evento. */
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
