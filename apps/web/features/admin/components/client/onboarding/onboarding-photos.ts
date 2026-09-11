/**
 * Fotos de apoio do onboarding — recortes otimizados (webp ~800px) das imagens
 * gen da landing, servidas de `public/onboarding/`. São imagens de exemplo
 * (fotografia gerada, nunca mídia de convidado); existem só para dar o clima do
 * card de tipo, do estilo e da prévia. A capa real do evento continua sendo a
 * foto que o anfitrião escolhe.
 */

export const PHOTO_POOL: readonly string[] = Array.from(
  { length: 10 },
  (_, i) => `/onboarding/photo-${String(i + 1).padStart(2, "0")}.webp`,
);

/** Foto padrão quando um tipo/estilo não tem uma dedicada. */
export const FALLBACK_PHOTO = PHOTO_POOL[0]!;

/** Tipo de evento → foto do card, indexada pela ordem de criação do pack
 *  (`ordemCriacao`, ADR 0019). Nunca por nome de domínio — palavra de domínio não
 *  mora em componente; só os packs de criação (ordem 1..6) chegam aqui. */
const TYPE_PHOTO_POR_ORDEM: Record<number, string> = {
  1: "/onboarding/photo-08.webp",
  2: "/onboarding/photo-09.webp",
  3: "/onboarding/photo-02.webp",
  4: "/onboarding/photo-03.webp",
  5: "/onboarding/photo-07.webp",
  6: "/onboarding/photo-01.webp",
};

export function typePhoto(ordemCriacao: number | undefined): string {
  return (ordemCriacao != null ? TYPE_PHOTO_POR_ORDEM[ordemCriacao] : undefined) ?? FALLBACK_PHOTO;
}

/** Estilo → foto do card (por chave de estilo). */
export const STYLE_PHOTO: Record<string, string> = {
  editorial: "/onboarding/photo-08.webp",
  minimal: "/onboarding/photo-05.webp",
  contempo: "/onboarding/photo-07.webp",
  fotografico: "/onboarding/photo-01.webp",
  classic: "/onboarding/photo-10.webp",
};

export function stylePhoto(chave: string): string {
  return STYLE_PHOTO[chave] ?? FALLBACK_PHOTO;
}
