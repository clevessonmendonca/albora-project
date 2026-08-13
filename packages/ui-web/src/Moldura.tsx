import type { CSSProperties } from "react";

/**
 * O lugar de uma foto.
 *
 * Com `src`, é a foto. Sem, é um buraco declarado — luzes fora de foco, o céu
 * de festa à noite — em vez de `<img>` quebrado ou retângulo cinza. Cinza
 * neutro passa por decisão de design e sobrevive à revisão; isto não passa.
 *
 * Preenche o pai por `absolute inset-0`; quem dá forma (proporção, raio,
 * recorte) é o slot ao redor. Assim a regra "nada corta na vertical" fica no
 * slot, que declara a proporção, e não escondida aqui.
 */
const ATMOSFERA = [
  "radial-gradient(circle 14px at 22% 26%, color-mix(in srgb, var(--acento) 55%, transparent), transparent 100%)",
  "radial-gradient(circle 9px at 68% 18%, color-mix(in srgb, var(--acento) 42%, transparent), transparent 100%)",
  "radial-gradient(circle 20px at 79% 72%, color-mix(in srgb, var(--acento) 30%, transparent), transparent 100%)",
  "radial-gradient(circle 7px at 41% 61%, color-mix(in srgb, var(--acento) 48%, transparent), transparent 100%)",
  "radial-gradient(circle 11px at 12% 82%, color-mix(in srgb, var(--acento) 26%, transparent), transparent 100%)",
  "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
].join(", ");

type Props = {
  rotulo?: string;
  src?: string;
  prioridade?: boolean;
  atmosfera?: boolean;
  /** Desloca as luzes, para slots lado a lado não repetirem o mesmo céu. */
  variante?: number;
};

export function Moldura({ rotulo = "", src, prioridade, atmosfera, variante = 0 }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={rotulo}
        loading={prioridade ? "eager" : "lazy"}
        decoding="async"
        {...(prioridade ? { fetchPriority: "high" as const } : {})}
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  const fundo: CSSProperties = atmosfera
    ? {
        backgroundImage: ATMOSFERA,
        backgroundSize: "125% 125%",
        backgroundPositionX: `${(variante * 23) % 101}%`,
        backgroundPositionY: `${(variante * 41) % 101}%`,
      }
    : {
        backgroundImage:
          "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
      };

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-acento-fundo"
      style={fundo}
    />
  );
}
