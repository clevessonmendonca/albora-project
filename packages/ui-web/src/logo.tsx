import { DEGRADE_DA_MARCA } from "@albora/tokens";

/**
 * O logotipo do Albora — símbolo mais nome, a família "ponto" que o
 * `brand/LEIA-ME.md` define como padrão ("sóbrio, atemporal, sobrevive a
 * qualquer redução"). A estrela é a variante expressiva e fica para capa,
 * avatar e papelaria.
 *
 * Vem inline, e não como `<img>`, por um motivo: o painel tem chão claro e
 * escuro, e o pack traz um arquivo para cada um — dois `<img>` alternados
 * piscariam na troca de tema e pediriam um request a mais. Aqui o nome herda
 * `currentColor`, então acompanha o tema sozinho.
 *
 * O arco mantém o degradê âmbar fixo: §2 trata as cores da marca como FIXAS, e
 * ele é o único lugar do painel onde o âmbar não cede à identidade do casal.
 */

type Props = {
  /** Altura em px. Abaixo de 24 o arco afina demais — use `MarcaAlbora`. */
  altura?: number;
  className?: string;
};

const PROPORCAO = 300 / 64;

export function LogoAlbora({ altura = 32, className }: Props) {
  return (
    <svg
      viewBox="0 0 300 64"
      width={Math.round(altura * PROPORCAO)}
      height={altura}
      role="img"
      aria-label="Albora"
      className={className}
    >
      <defs>
        <linearGradient id="albora-arco" gradientUnits="userSpaceOnUse" x1="32" y1="44" x2="32" y2="19">
          <stop offset="0" stopColor={DEGRADE_DA_MARCA.base} />
          <stop offset=".5" stopColor={DEGRADE_DA_MARCA.meio} />
          <stop offset="1" stopColor={DEGRADE_DA_MARCA.topo} />
        </linearGradient>
      </defs>
      <path
        d="M11 42 A21 21 0 0 1 53 42"
        fill="none"
        stroke="url(#albora-arco)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="32" cy="39.4" r="2.9" fill={DEGRADE_DA_MARCA.meio} />
      <text
        x="86"
        y="46"
        fontFamily="var(--fonte-titulo, Fraunces, Georgia, serif)"
        fontWeight="400"
        fontSize="42"
        letterSpacing="3.4"
        fill="currentColor"
      >
        Albora
      </text>
    </svg>
  );
}
