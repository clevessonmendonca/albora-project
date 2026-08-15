import { isValidPlace, PACKS } from "@albora/packs";

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

  return isValidPlace(pack, valor) ? valor : null;
}

const ANO_MIN = 1990;
const ANO_MAX = 2100;
const LADO_MAX = 20_000;

/**
 * Instante declarado pelo cliente, lido do EXIF **antes** do reencode.
 *
 * O servidor não relê o arquivo: o GPS já saiu. Confere só que é uma data
 * real dentro de um século plausível; a janela do evento o núcleo do álbum
 * aplica, caindo no `created_at` quando o relógio do aparelho mentiu.
 */
export function acceptedTakenAt(valor: unknown): Date | null {
  if (typeof valor !== "string" || valor.length < 10 || valor.length > 40) return null;

  const em = new Date(valor);
  if (Number.isNaN(em.getTime())) return null;

  const ano = em.getUTCFullYear();
  if (ano < ANO_MIN || ano > ANO_MAX) return null;

  return em;
}

/**
 * Par de dimensões já em pé. Um lado só não serve — misturar largura real
 * com altura padrão vira paisagem no slot de retrato e corta cabeça.
 */
export function acceptedSize(largura: unknown, altura: unknown): {
  width: number;
  height: number;
} | null {
  const w = ladoInteiro(largura);
  const h = ladoInteiro(altura);
  if (w === null || h === null) return null;
  return { width: w, height: h };
}

function ladoInteiro(valor: unknown): number | null {
  if (typeof valor !== "number" || !Number.isInteger(valor)) return null;
  if (valor < 1 || valor > LADO_MAX) return null;
  return valor;
}
