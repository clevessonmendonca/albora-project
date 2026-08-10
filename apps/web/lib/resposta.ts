/**
 * Um envelope de erro só: `code` legível por máquina, `message` genérica,
 * `details` operacional.
 *
 * O cliente ramifica no `code`, que é estável entre deploys — nunca no texto
 * da `message`, que muda numa revisão de copy. E nada de interno vai para a
 * resposta: pilha, SQL e resposta de fornecedor ficam no log do servidor.
 */

export type Detalhes = Record<string, unknown>;

export function erro(status: number, code: string, message: string, details?: Detalhes) {
  return Response.json(
    details ? { code, message, details } : { code, message },
    { status, headers: { "cache-control": "no-store" } },
  );
}

export function ok(corpo: unknown, init?: ResponseInit) {
  return Response.json(corpo, {
    ...init,
    headers: { "cache-control": "no-store", ...init?.headers },
  });
}

/**
 * Traduz o que vier de baixo em código seguro, logando o diagnóstico
 * completo de um lado só da fronteira.
 */
export function erroInesperado(contexto: string, e: unknown) {
  console.error("erro.inesperado", { contexto, erro: String(e) });
  return erro(500, "erro.interno", "Não foi possível concluir");
}
