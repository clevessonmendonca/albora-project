/**
 * O conteúdo de um QR é dado de terceiro.
 *
 * A placa fica seis horas numa mesa sem ninguém olhando, e um adesivo colado
 * por cima do original é ataque real. Por isso o host do QR nunca é destino:
 * só o slug sobrevive, e o caminho é remontado aqui, com `via` no query.
 */

import type { EntryVia } from "@albora/core";

/** Minúscula, dígito e hífen entre blocos. Sem hífen na ponta, sem hífen duplo. */
const PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MIN_LENGTH = 2;
const MAX_LENGTH = 64;

/** Um QR guarda alguns milhares de caracteres. Nada legítimo chega perto. */
const CONTENT_LIMIT = 2048;

/** Marcas de acento na forma decomposta — `NFD` separa a letra do acento. */
const ACCENTS = /[\u0300-\u036f]/g;

export function isValidSlug(value: string): boolean {
  return (
    value.length >= MIN_LENGTH &&
    value.length <= MAX_LENGTH &&
    PATTERN.test(value)
  );
}

/**
 * Extrai o slug do que veio do QR ou do que a pessoa digitou.
 *
 * Aceita URL completa, URL curta impressa (N1.4) e o código sozinho. Devolve
 * `null` para qualquer coisa que não passe no formato — nunca o conteúdo cru.
 */
export function extractSlug(content: string): string | null {
  const raw = content.trim();
  if (raw.length === 0 || raw.length > CONTENT_LIMIT) return null;

  const url = asUrl(raw);

  // `javascript:` e `data:` também são URL válida, e o que decide não é isto —
  // é o formato fechado lá embaixo. Recusar aqui só evita que um esquema
  // exótico chegue à extração de caminho parecendo legítimo.
  if (url !== null && url.protocol !== "https:" && url.protocol !== "http:") return null;

  const candidate = url === null ? raw : eventSegment(url);
  if (candidate === null) return null;

  const slug = normalize(candidate);
  return isValidSlug(slug) ? slug : null;
}

/** O único lugar que monta o destino. O slug entra já validado. */
export function eventPath(slug: string): string {
  return `/e/${encodeURIComponent(slug)}`;
}

/** Entrada do convidado com canal (`via=qr` na peça; `wa`/`link` no convite). */
export function eventEntryPath(slug: string, via: EntryVia): string {
  return `${eventPath(slug)}?via=${via}`;
}

export function eventEntryUrl(origin: string, slug: string, via: EntryVia): string {
  return `${origin}${eventEntryPath(slug, via)}`;
}

export function whatsappInviteUrl(origin: string, slug: string): string {
  return `https://wa.me/?text=${encodeURIComponent(eventEntryUrl(origin, slug, "wa"))}`;
}

function asUrl(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    // Pode ser a URL curta impressa sem esquema — `albora.com.br/anaejoao`.
  }

  if (!raw.includes("/") && !raw.includes(".")) return null;

  try {
    return new URL(`https://${raw}`);
  } catch {
    return null;
  }
}

function eventSegment(url: URL): string | null {
  const parts = url.pathname.split("/").filter((part) => part.length > 0);
  const first = parts[0];
  if (first === undefined) return null;

  // `/e/{slug}` é a rota do produto; `/{slug}` é a URL curta que vai impressa
  // abaixo do QR. As duas existem no material, então as duas entram.
  const raw = first === "e" ? parts[1] : first;
  return raw === undefined ? null : decode(raw);
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalize(value: string): string {
  return value.trim().normalize("NFD").replace(ACCENTS, "").toLowerCase();
}

/** @deprecated use isValidSlug */
export const slugValido = isValidSlug;

/** @deprecated use extractSlug */
export const extrairSlug = extractSlug;

/** @deprecated use eventPath */
export const caminhoDoEvento = eventPath;
