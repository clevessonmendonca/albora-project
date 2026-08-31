import { ALBORA_BRAND } from "@albora/tokens";

/** Usa ALBORA_BRAND, não --fonte-titulo: o evento sobrescreve o título, mas nunca a assinatura da marca. */
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
