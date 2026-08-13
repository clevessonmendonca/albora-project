import { cn } from "@albora/ui-web";
import type { CSSProperties, ReactNode } from "react";

/**
 * As peças repetidas da landing da v4 — a pílula, o rótulo, o chão quente e a
 * moldura de foto.
 *
 * Existem para que o mesmo desenho não seja redigitado em nove lugares e
 * divirja em três. Nenhuma cor literal: a v4 escreve `#FFF6E9` e aqui isso é
 * papel aquecido pelo âmbar **do evento**, que é o que faz a landing mudar de
 * cara quando o casal muda a dele.
 */

export const pilulaClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-ink px-8 py-4 font-medium text-bg no-underline";

export const pilulaClaraClasses =
  "pilula inline-flex items-center justify-center whitespace-nowrap rounded-pilula bg-superficie-alta px-8 py-4 font-normal text-ink no-underline";

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
      {children}
    </p>
  );
}

export function Titulo({
  children,
  tamanho = "clamp(1.75rem, 4.2vw, 3.25rem)",
  className,
}: {
  children: ReactNode;
  tamanho?: string;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "m-0 font-titulo font-light leading-[1.03] tracking-titulo text-balance",
        className,
      )}
      style={{ fontSize: tamanho }}
    >
      {children}
    </h2>
  );
}

/** A oração em itálico e âmbar que a v4 usa para fechar todo título. */
export function Realce({ children }: { children: ReactNode }) {
  return <em className="font-normal italic text-acento-texto">{children}</em>;
}

/**
 * O lugar de uma foto.
 *
 * Com `src`, é a foto. Sem, é um buraco **declarado** — desenhado como prova
 * de revelação, com as marcas de corte e a tarja de legenda, em vez de virar
 * `<img>` quebrado ou retângulo cinza. Cinza neutro passa por decisão de
 * design e sobrevive à revisão; isto não passa.
 */
export { Moldura as Frame };

export function Moldura({
  rotulo,
  raio: curvatura,
  src,
  prioridade,
  atmosfera,
  variante,
}: {
  rotulo: string;
  raio: string;
  src?: string;
  prioridade?: boolean;
  /**
   * Luzes fora de foco, para o slot que espera foto de festa à noite.
   *
   * São pontos pequenos e discretos de propósito: um borrão que cobre o
   * quadro inteiro lê como imagem quebrada carregando, e foi assim que a
   * primeira versão desta moldura errou.
   */
  atmosfera?: boolean;
  /** Desloca as luzes, para cinco slots lado a lado não repetirem o mesmo céu. */
  variante?: number;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={rotulo}
        loading={prioridade ? "eager" : "lazy"}
        decoding="async"
        {...(prioridade ? { fetchPriority: "high" as const } : {})}
        className="absolute inset-0 h-full w-full object-cover"
        style={radiusStyle(curvatura)}
      />
    );
  }

  const background: CSSProperties = atmosfera
    ? {
        backgroundImage: ATMOSPHERE,
        backgroundSize: "125% 125%",
        backgroundPositionX: `${((variante ?? 0) * 23) % 101}%`,
        backgroundPositionY: `${((variante ?? 0) * 41) % 101}%`,
      }
    : {
        backgroundImage:
          "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
      };

  return (
    <div
      className="brilho absolute inset-0 grid place-items-center overflow-hidden bg-acento-fundo p-3"
      style={{ ...radiusStyle(curvatura), ...background }}
    >
      {rotulo || atmosfera ? null : (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(18%,2.25rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink-borda-forte"
          aria-hidden="true"
        />
      )}
      {rotulo ? (
        <span className="relative max-w-[18ch] rounded-pilula bg-bg-vidro-medio px-3 py-1.5 text-center text-[0.625rem] uppercase leading-[1.35] tracking-rotulo text-ink-2">
          {rotulo}
        </span>
      ) : null}
    </div>
  );
}

const ATMOSPHERE = [
  "radial-gradient(circle 14px at 22% 26%, color-mix(in srgb, var(--acento) 55%, transparent), transparent 100%)",
  "radial-gradient(circle 9px at 68% 18%, color-mix(in srgb, var(--acento) 42%, transparent), transparent 100%)",
  "radial-gradient(circle 20px at 79% 72%, color-mix(in srgb, var(--acento) 30%, transparent), transparent 100%)",
  "radial-gradient(circle 7px at 41% 61%, color-mix(in srgb, var(--acento) 48%, transparent), transparent 100%)",
  "radial-gradient(circle 11px at 12% 82%, color-mix(in srgb, var(--acento) 26%, transparent), transparent 100%)",
  "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
].join(", ");

/** Longhand border-radius — `border-radius: var(--raio)` quebra hidratação. */
export function radiusStyle(v: string): CSSProperties {
  return {
    borderTopLeftRadius: v,
    borderTopRightRadius: v,
    borderBottomLeftRadius: v,
    borderBottomRightRadius: v,
  };
}

export function transicao(propriedade: string, tempo = "var(--tempo)"): CSSProperties {
  return {
    transitionProperty: propriedade,
    transitionDuration: tempo,
    transitionTimingFunction: "var(--curva)",
  };
}
