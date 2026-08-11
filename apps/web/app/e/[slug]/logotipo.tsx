import { MARCA_ALBORA } from "@albora/tokens";

/**
 * O logotipo Albora numa cor só, herdada de `--ink`.
 *
 * A fonte vem de `MARCA_ALBORA`, não de `--fonte-titulo`: o token de título é
 * sobrescrito pela fonte do casal, e a marca é a moldura — se o evento
 * repintasse o logotipo, ele deixaria de ser assinatura.
 */
export function Logotipo({ largura = "9.5rem" }: { largura?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 300 64"
      style={{ width: largura, height: "auto", display: "block", color: "var(--ink)" }}
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
        fontFamily={MARCA_ALBORA.fontes.titulo}
        fontWeight={400}
        fontSize="42"
        letterSpacing="3.4"
      >
        Albora
      </text>
    </svg>
  );
}
