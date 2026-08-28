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

export function unexpectedError(context: string, e: unknown) {
  console.error("erro.inesperado", { contexto: context, erro: String(e) });
  return errorResponse(500, "erro.interno", "Não foi possível concluir");
}
