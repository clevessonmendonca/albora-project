type EnglishEventRoute = (
  req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) => Promise<Response>;

type LegacyEventRoute = (
  req: Request,
  ctx: { params: Promise<{ eventoId: string }> },
) => Promise<Response>;

/** Adapt a Portuguese `/eventos/[eventoId]` shim onto an English `eventId` handler. */
export function withLegacyEventId(handler: EnglishEventRoute): LegacyEventRoute {
  return (req, ctx) =>
    handler(req, {
      params: ctx.params.then(({ eventoId }) => ({ eventId: eventoId })),
    });
}
