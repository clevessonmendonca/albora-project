import { lugarValido, PACKS } from "@albora/packs";

/**
 * Normalização de legenda e lugar, num lugar só.
 *
 * Os dois campos entram por duas portas — junto do `confirm` e pela rota de
 * anotação — e uma normalização diferente em cada porta seria a mesma coisa
 * que não ter nenhuma.
 */

export const MAX_CAPTION = 280;

/**
 * Devolve `null` para qualquer coisa que não seja texto com conteúdo.
 *
 * `null` é o sinal de "não mexe": o `COALESCE` do UPDATE preserva o que já
 * estava lá, e é isso que permite anotar só o lugar sem apagar a legenda.
 */
export function cleanCaption(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  // Controles fora — a legenda vai para o telão, e caractere de controle
  // projetado numa parede é bug de layout na frente de 150 pessoas.
  const limpa = valor.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().slice(0, MAX_CAPTION);

  return limpa.length > 0 ? limpa : null;
}

/**
 * Conjunto fechado, resolvido pelo pack do evento — nunca pelo que o cliente
 * mandou. É o que impede uma coordenada de entrar pela porta da frente depois
 * de o EXIF ter sido removido no cliente (N6.9).
 */
export function acceptedPlace(packId: string | null, valor: unknown): string | null {
  if (typeof valor !== "string" || !packId) return null;

  const pack = PACKS[packId];
  if (!pack) return null;

  return lugarValido(pack, valor) ? valor : null;
}
