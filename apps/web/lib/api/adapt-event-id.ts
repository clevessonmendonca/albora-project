type LegacyEventRoute = (
  req: Request,
  ctx: { params: Promise<{ eventoId: string }> },
) => Promise<Response>;

type EnglishEventRoute = (
  req: Request,
  ctx: { params: Promise<{ eventId: string }> },
) => Promise<Response>;

export function withEventId(handler: LegacyEventRoute): EnglishEventRoute {
  return (req, ctx) =>
    handler(req, {
      params: ctx.params.then(({ eventId }) => ({ eventoId: eventId })),
    });
}
