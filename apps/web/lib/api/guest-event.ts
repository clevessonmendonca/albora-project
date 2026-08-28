import { errorResponse } from "./response";

type GuestSessionIds = {
  eventoId: string;
  sessaoId: string;
};

/** Recusa `evento` que não bate com a sessão; `null` (query ausente) e `undefined` (campo ausente) passam — `null` no JSON é outro evento. */
export function rejectGuestEventMismatch(
  requested: unknown,
  session: GuestSessionIds,
  code: string,
): Response | null {
  if (requested === undefined || requested === session.eventoId) return null;
  console.warn(code, { eventoId: session.eventoId, sessaoId: session.sessaoId });
  return errorResponse(403, code, "Esta sessão não pertence a este evento");
}

export function rejectGuestEventQueryMismatch(
  req: Request,
  session: GuestSessionIds,
  code: string,
): Response | null {
  return rejectGuestEventMismatch(
    new URL(req.url).searchParams.get("evento") ?? undefined,
    session,
    code,
  );
}
