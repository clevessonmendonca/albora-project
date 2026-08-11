"use client";

/**
 * Uma foto no feed em coluna única.
 *
 * 🔴 **Nunca corta.** A foto entra com `max-width` e `max-height` e as duas
 * dimensões em `auto`: o navegador preserva a proporção real e encaixa dentro
 * dos dois limites sozinho, sem que a tela precise saber se a foto é 9:16 ou
 * 3:2. Vertical fica alta e centrada, horizontal ocupa a largura — e nenhuma
 * das duas perde um pixel.
 *
 * O teto de altura existe porque uma 9:16 na largura do celular passaria de uma
 * tela inteira, e a pessoa rolaria dentro de uma foto só sem saber que há mais.
 * O piso reserva o espaço antes de a imagem chegar, para a coluna não pular
 * embaixo do dedo em 4G ruim.
 */

const ALTURA_MAXIMA = "72dvh";
const ALTURA_MINIMA = "44dvh";

const MIDIA: React.CSSProperties = {
  display: "grid",
  placeItems: "center",
  position: "relative",
  minHeight: ALTURA_MINIMA,
  maxHeight: ALTURA_MAXIMA,
};

export function Publicacao({
  url,
  autor,
  legenda,
}: {
  url: string | null;
  autor: string;
  legenda: string | null;
}) {
  return (
    <article
      style={{
        display: "grid",
        gap: "calc(var(--espaco) * 3)",
        paddingBottom: "calc(var(--espaco) * 6)",
        borderBottom: "1px solid var(--linha)",
      }}
    >
      {/* O crédito é o mecanismo de reconhecimento social (flows N3.4), e vem
          antes da foto: é o nome que faz a mesa reconhecer de quem ela é. */}
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "0.68rem",
          fontWeight: 400,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--ink-2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {autor}
      </span>

      <div style={MIDIA}>
        {/* Sem `src` enquanto a URL não chega: um endereço vazio pinta o ícone
            de imagem quebrada, e moldura vazia é a degradação com dignidade. */}
        {url ? (
          <img
            className="feed-amanhece"
            src={url}
            alt={legenda ?? ""}
            loading="lazy"
            decoding="async"
            style={{
              display: "block",
              width: "auto",
              height: "auto",
              maxWidth: "100%",
              maxHeight: ALTURA_MAXIMA,
              borderRadius: "var(--raio)",
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: "0 15%",
              border: "1px solid var(--linha)",
              borderRadius: "var(--raio)",
            }}
          />
        )}
      </div>

      {legenda && (
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.6, color: "var(--ink-2)" }}>
          {legenda}
        </p>
      )}
    </article>
  );
}

/** O estado de carregamento é a própria coluna, não um giro no meio da tela. */
export function PublicacaoCarregando() {
  return (
    <article
      aria-hidden
      style={{
        display: "grid",
        gap: "calc(var(--espaco) * 3)",
        paddingBottom: "calc(var(--espaco) * 6)",
        borderBottom: "1px solid var(--linha)",
      }}
    >
      <span
        className="feed-esperando"
        style={{
          width: "6rem",
          height: "0.68rem",
          borderRadius: "var(--raio-pilula)",
          background: "var(--superficie-alta)",
        }}
      />
      <div style={MIDIA}>
        <div
          className="feed-esperando"
          style={{
            position: "absolute",
            inset: "0 15%",
            border: "1px solid var(--linha)",
            borderRadius: "var(--raio)",
          }}
        />
      </div>
    </article>
  );
}
