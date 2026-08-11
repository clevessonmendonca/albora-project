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
  borderRadius: "var(--raio-pilula)",
  background: "var(--ink)",
  color: "var(--bg)",
  fontWeight: 500,
  textDecoration: "none",
  whiteSpace: "nowrap",
};

export const PILULA_CLARA: CSSProperties = {
  ...PILULA,
  background: "var(--superficie-alta)",
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
 * O lugar de uma foto que ainda não existe.
 *
 * Declarado como buraco em vez de virar `<img>` quebrado ou cinza neutro —
 * cinza neutro passa por decisão de design e sobrevive à revisão.
 */
export function Moldura({ rotulo, raio }: { rotulo: string; raio: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: raio,
        background:
          "linear-gradient(160deg, color-mix(in srgb, var(--acento) 24%, var(--superficie-alta)), var(--superficie))",
        display: "grid",
        placeItems: "center",
        padding: "0.75rem",
        textAlign: "center",
        fontSize: "0.6875rem",
        letterSpacing: "var(--tracking-rotulo)",
        textTransform: "uppercase",
        color: "var(--ink-3)",
      }}
    >
      {rotulo}
    </div>
  );
}
