import type { GuestbookAudio } from "@albora/core";
import {
  enforceRateLimit,
  jsonOk,
  rejectGuestEventQueryMismatch,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { signGuestbookAudio } from "./guestbook-audio-url";
import {
  getGuestbook,
  markGuestbookReadUseCase,
} from "@/lib/application/use-cases/guest";

export const dynamic = "force-dynamic";

/** Convidado lê o recado do evento da sessão — não autoriza gravar; recado sem carregar = resposta vazia, câmera segue. */
export async function GET(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, { keyPrefix: "recado:" });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "recado.evento_divergente",
  );
  if (mismatch) return mismatch;

  try {
    const result = await getGuestbook(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
      },
      getPool(),
    );

    // get-guestbook.ts's GetGuestbookOutput mistypes tela.audio as `string | null`; at runtime it is
    // the GuestbookAudio | null that @albora/core's buildGuestbookScreen returns (own tsc error there,
    // outside this file's scope — narrow assertion until that annotation is corrected).
    const audio = await signGuestbookAudio(result.tela.audio as GuestbookAudio | null);

    return jsonOk({
      mostrar: result.mostrar,
      codigo: result.codigo,
      tela: { ...result.tela, audio },
    });
  } catch (e) {
    return unexpectedError("recado.get", e);
  }
}

/** Marca recado como lido: id sai do evento da sessão, nunca do corpo — id de outra festa não troca de evento. */
export async function POST(req: Request) {
  const auth = await requireGuestSession(req);
  if (auth instanceof Response) return auth;

  const limited = enforceRateLimit(req, auth.session, {
    max: 60,
    keyPrefix: "recado:",
  });
  if (limited) return limited;

  const mismatch = rejectGuestEventQueryMismatch(
    req,
    auth.session,
    "recado.evento_divergente",
  );
  if (mismatch) return mismatch;

  try {
    const resultado = await markGuestbookReadUseCase(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
      },
      getPool(),
    );

    return jsonOk(resultado);
  } catch (e) {
    return unexpectedError("recado.post", e);
  }
}
