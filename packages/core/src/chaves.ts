/**
 * A chave de storage é derivada no servidor. Sempre.
 *
 * O cliente nunca informa e nunca escolhe — nem no presign, nem no confirm
 * (ADR 0002, ADR 0004). Está aqui em vez de dentro da rota porque a rota é
 * camada fina de transporte: se a derivação morar lá, a segunda rota que
 * precisar dela vai copiar, e a cópia vai divergir.
 */
export function derivarChaveMidia(
  eventoId: string,
  uuid: string,
  variante: "full" | "thumb",
): string {
  const agora = new Date();
  const ano = agora.getUTCFullYear();
  const mes = String(agora.getUTCMonth() + 1).padStart(2, "0");
  return `events/${eventoId}/${ano}/${mes}/${uuid}/${variante}`;
}

/** Toda chave do produto começa aqui. Usado pelo guard de isolamento. */
export function prefixoDoEvento(eventoId: string): string {
  return `events/${eventoId}/`;
}

/** Deriva a chave `/thumb` a partir da `/full` já persistida. */
export function chaveThumbDeFull(chaveFull: string): string {
  if (chaveFull.endsWith("/full")) {
    return `${chaveFull.slice(0, -"/full".length)}/thumb`;
  }
  return `${chaveFull}/thumb`;
}
