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

export const RAIO_CASCA = "var(--raio-superficie)";

/** O gradiente quente da v4: papel puxado para o âmbar, não um creme fixo. */
export const CHAO_QUENTE =
  "linear-gradient(168deg, color-mix(in srgb, var(--acento) 6%, var(--superficie-alta)), color-mix(in srgb, var(--acento) 14%, var(--superficie)) 55%, color-mix(in srgb, var(--acento) 26%, var(--superficie)))";

export const PILULA: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem 2rem",
  ...raio("var(--raio-pilula)"),
  backgroundColor: "var(--ink)",
  color: "var(--bg)",
  fontWeight: 500,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export const PILULA_CLARA: CSSProperties = {
  ...PILULA,
  backgroundColor: "var(--superficie-alta)",
  color: "var(--ink)",
  fontWeight: 400,
};

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 1rem",
        fontSize: "0.8125rem",
        letterSpacing: "var(--tracking-rotulo)",
        textTransform: "uppercase",
        color: "var(--acento-texto)",
      }}
    >
      {children}
    </p>
  );
}

export function Titulo({
  children,
  tamanho = "clamp(1.75rem, 4.2vw, 3.25rem)",
  ...resto
}: {
  children: ReactNode;
  tamanho?: string;
} & { style?: CSSProperties }) {
  return (
    <h2
      style={{
        margin: 0,
        fontFamily: "var(--fonte-titulo)",
        fontWeight: 300,
        fontSize: tamanho,
        lineHeight: 1.03,
        letterSpacing: "var(--tracking-titulo)",
        textWrap: "balance",
        ...resto.style,
      }}
    >
      {children}
    </h2>
  );
}

/** A oração em itálico e âmbar que a v4 usa para fechar todo título. */
export function Realce({ children }: { children: ReactNode }) {
  return (
    <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--acento-texto)" }}>
      {children}
    </em>
  );
}

/**
 * Profundidade em duas alturas, tirada da tinta do evento.
 *
 * Sombra cinza sobre papel quente suja; puxada do `--ink` ela escurece na
 * mesma família da identidade e continua certa quando o casal troca a cor.
 */
export const SOMBRA = "0 1px 2px color-mix(in srgb, var(--ink) 7%, transparent), 0 10px 26px -14px color-mix(in srgb, var(--ink) 26%, transparent)";

export const SOMBRA_ALTA =
  "0 2px 4px color-mix(in srgb, var(--ink) 6%, transparent), 0 14px 32px -10px color-mix(in srgb, var(--ink) 20%, transparent), 0 44px 88px -36px color-mix(in srgb, var(--ink) 34%, transparent)";

/**
 * O lugar de uma foto.
 *
 * Com `src`, é a foto. Sem, é um buraco **declarado** — desenhado como prova
 * de revelação, com as marcas de corte e a tarja de legenda, em vez de virar
 * `<img>` quebrado ou retângulo cinza. Cinza neutro passa por decisão de
 * design e sobrevive à revisão; isto não passa.
 */
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
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          ...raio(curvatura),
        }}
      />
    );
  }

  return (
    <div
      className="brilho"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        overflow: "hidden",
        ...raio(curvatura),
        backgroundColor: "color-mix(in srgb, var(--acento) 9%, var(--superficie-alta))",
        backgroundImage: atmosfera
          ? [
              "radial-gradient(circle 14px at 22% 26%, color-mix(in srgb, var(--acento) 55%, transparent), transparent 100%)",
              "radial-gradient(circle 9px at 68% 18%, color-mix(in srgb, var(--acento) 42%, transparent), transparent 100%)",
              "radial-gradient(circle 20px at 79% 72%, color-mix(in srgb, var(--acento) 30%, transparent), transparent 100%)",
              "radial-gradient(circle 7px at 41% 61%, color-mix(in srgb, var(--acento) 48%, transparent), transparent 100%)",
              "radial-gradient(circle 11px at 12% 82%, color-mix(in srgb, var(--acento) 26%, transparent), transparent 100%)",
              "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
            ].join(", ")
          : "linear-gradient(158deg, color-mix(in srgb, var(--acento) 10%, transparent), transparent 62%)",
        // A camada precisa ser maior que o quadro, senão a posição não tem
        // para onde correr e os cinco slots repetem o mesmo céu.
        ...(atmosfera
          ? {
              backgroundSize: "125% 125%",
              backgroundPositionX: `${((variante ?? 0) * 23) % 101}%`,
              backgroundPositionY: `${((variante ?? 0) * 41) % 101}%`,
            }
          : {}),
        display: "grid",
        placeItems: "center",
        padding: "0.75rem",
      }}
    >
      {rotulo || atmosfera ? null : (
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "min(18%, 2.25rem)",
            aspectRatio: "1",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--ink) 20%, transparent)",
            pointerEvents: "none",
          }}
        />
      )}
      {rotulo ? (
        <span
          style={{
            position: "relative",
            maxWidth: "18ch",
            padding: "0.375rem 0.75rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "color-mix(in srgb, var(--bg) 78%, transparent)",
            textAlign: "center",
            fontSize: "0.625rem",
            lineHeight: 1.35,
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: "var(--ink-2)",
          }}
        >
          {rotulo}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Raio como quatro longhands, e transição idem.
 *
 * `border-radius: var(--raio)` em style inline quebra a hidratação: o atalho
 * com `var()` vira "pending substitution", a CSSOM devolve `""` nas longhands,
 * e é isso que o React lê ao comparar servidor com cliente. Longhand com
 * `var()` serializa normal — é por isso que `color: var(--ink)` sempre bateu.
 */
export function raio(v: string): CSSProperties {
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
