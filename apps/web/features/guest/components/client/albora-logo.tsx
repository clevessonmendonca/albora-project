import { ALBORA_BRAND } from "@albora/tokens";

/**
 * O logotipo Albora numa cor só, herdada de `--ink`.
 *
 * A fonte vem de `ALBORA_BRAND`, não de `--fonte-titulo`: o token de título é
 * sobrescrito pela fonte do casal, e a marca é a moldura — se o evento
 * repintasse o logotipo, ele deixaria de ser assinatura.
 */
export function AlboraLogo({ width = "9.5rem" }: { width?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 300 64"
      style={{ width, height: "auto", display: "block", color: "var(--ink)" }}
      role="img"
      aria-label="Albora"
    >
      <path
        d="M11 42 A21 21 0 0 1 53 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="39.2" r="3.6" fill="currentColor" />
      <text
        x="86"
        y="46"
        fill="currentColor"
        fontFamily={ALBORA_BRAND.fontes.titulo}
        fontWeight={400}
        fontSize="42"
        letterSpacing="3.4"
      >
        Albora
      </text>
    </svg>
  );
}
