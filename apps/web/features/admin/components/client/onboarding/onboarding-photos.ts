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

/** Tipo de evento → foto do card (por `packId`). Só os packs de criação. */
export const TYPE_PHOTO: Record<string, string> = {
  casamento: "/onboarding/photo-08.webp",
  aniversario: "/onboarding/photo-09.webp",
  formatura: "/onboarding/photo-02.webp",
  corporativo: "/onboarding/photo-03.webp",
  celebracao: "/onboarding/photo-07.webp",
  outro: "/onboarding/photo-01.webp",
  "quinze-anos": "/onboarding/photo-04.webp",
  "pre-casamento": "/onboarding/photo-06.webp",
};

export function typePhoto(packId: string): string {
  return TYPE_PHOTO[packId] ?? FALLBACK_PHOTO;
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
