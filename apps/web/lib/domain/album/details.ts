import { instanteDaParedeNoFuso } from "@albora/core";
import { isValidPlace, PACKS } from "@albora/packs";

/** Normalização de legenda e lugar em um lugar só — entram por `confirm` e pela rota de anotação; normalização diferente em cada porta = nenhuma. */

export const MAX_CAPTION = 280;

/** `null` = "não mexe": o `COALESCE` do UPDATE preserva o que estava — permite anotar só o lugar sem apagar a legenda. */
export function cleanCaption(valor: unknown): string | null {
  if (typeof valor !== "string") return null;

  const limpa = valor.replace(/[\p{Cc}\p{Cf}]/gu, " ").trim().slice(0, MAX_CAPTION);

  return limpa.length > 0 ? limpa : null;
}

/** Conjunto fechado resolvido pelo pack — impede coordenada entrar pela porta da frente depois do EXIF removido no cliente (N6.9). */
export function acceptedPlace(packId: string | null, valor: unknown): string | null {
  if (typeof valor !== "string" || !packId) return null;

  const pack = PACKS[packId];
  if (!pack) return null;

  return isValidPlace(pack, valor) ? valor : null;
}

const ANO_MIN = 1990;
const ANO_MAX = 2100;
const LADO_MAX = 20_000;

/** Instante declarado do EXIF (pré-reencode): só valida data plausível (1990–2100) — janela do evento o álbum aplica; relógio mentido cai no `created_at`. */
export function acceptedTakenAt(valor: unknown): Date | null {
  if (typeof valor !== "string" || valor.length < 10 || valor.length > 40) return null;

  const em = new Date(valor);
  if (Number.isNaN(em.getTime())) return null;

  const ano = em.getUTCFullYear();
  if (ano < ANO_MIN || ano > ANO_MAX) return null;

  return em;
}

/** Converte parede EXIF do cliente (UTC da câmera) para o fuso IANA do evento — instante absoluto que o álbum agrupa. */
export function acceptedTakenAtInTimeZone(valor: unknown, fuso: string): Date | null {
  const parede = acceptedTakenAt(valor);
  if (!parede) return null;
  return instanteDaParedeNoFuso(parede, fuso);
}

/** Par de dimensões ambos válidos — um lado só misturaria largura real com altura padrão e viraria paisagem no slot de retrato. */
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
