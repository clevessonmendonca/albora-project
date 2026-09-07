/** API response envelope: `code` estável para lógica de cliente, `message` genérico — detalhes internos ficam no log do servidor. */

export type ErrorDetails = Record<string, unknown>;

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails,
) {
  return Response.json(
    details ? { code, message, details } : { code, message },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function jsonOk(body: unknown, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { "cache-control": "no-store", ...init?.headers },
  });
}

export async function unexpectedError(context: string, e: unknown) {
  console.error("erro.inesperado", { contexto: context, erro: String(e) });

  // Explicitly capture to Sentry for error tracking and alerting
  // Must be async to allow Sentry to send if available
  try {
    if (process.env.SENTRY_DSN) {
      const { captureException } = await import("@sentry/nextjs");
      const error = e instanceof Error ? e : new Error(String(e));
      captureException(error, {
        tags: { context },
        level: "error",
      });
    }
  } catch {
    // Silently fail if Sentry capture fails — don't break the response
  }

  return errorResponse(500, "erro.interno", "Não foi possível concluir");
}
