/** API response envelope: `code` estável para lógica de cliente, `message` genérico — detalhes internos ficam no log do servidor. */

import { logger, metrics } from "@albora/core";

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

export function unexpectedError(context: string, e: unknown) {
  logger.error({ contexto: context, err: e }, "erro.inesperado");
  metrics.increment("http.errors", 1, { context, status: "500" });
  return errorResponse(500, "erro.interno", "Não foi possível concluir");
}
