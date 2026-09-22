/**
 * Nomes que não podem virar slug: cada evento é um `<slug>.<raiz>`
 * (`docs/security.md` §4.7), então um evento chamado "mídia" viraria
 * `midia.<raiz>` — a origem da própria aplicação.
 */
const SLUGS_RESERVADOS = new Set([
  "www", "app", "api", "admin", "painel", "midia", "media", "static", "cdn",
  "mail", "smtp", "blog", "docs", "status", "help", "suporte", "telao", "wall",
  "e", "f", "login", "sair", "conta", "assets", "cdn-cgi",
]);

const SLUG_MIN = 3;
const SLUG_MAX = 32;

/**
 * Slug a partir do nome do evento. O produto exige um slug **legível** — ele vai
 * impresso na placa e alguém vai ditá-lo no telefone (`docs/security.md` §4.7);
 * ditar "xygyd83w" é o que fazia a URL parecer código de rastreio.
 *
 * Devolve `null` quando o nome não rende base utilizável (vazio, só emoji, curto
 * demais ou reservado) — aí o chamador cai no slug aleatório de sempre.
 */
export function slugLegivelDeTitulo(titulo: string | null | undefined): string | null {
  if (!titulo) return null;

  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " e ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");

  if (base.length < SLUG_MIN) return null;
  if (SLUGS_RESERVADOS.has(base)) return null;
  return base;
}
