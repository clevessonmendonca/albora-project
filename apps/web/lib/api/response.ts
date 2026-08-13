/**
 * API response envelope: stable `code`, generic `message`, optional `details`.
 *
 * Clients branch on `code`, not on `message` copy. Internals stay in server logs.
 */

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
  console.error("erro.inesperado", { contexto: context, erro: String(e) });
  return errorResponse(500, "erro.interno", "Não foi possível concluir");
}
