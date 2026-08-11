"use client";

/**
 * Uma foto na grade.
 *
 * 🔴 **Nunca corta na vertical.** Três de cada quatro fotos de festa são
 * verticais, e encaixar 9:16 num quadrado com recorte descarta o topo — que é
 * onde estão as cabeças. A moldura tem proporção fixa e a foto entra inteira
 * dentro dela, apoiada na superfície como uma cópia montada em cartão: nada
 * é cortado, e a grade não muda de altura no meio da rolagem.
 */

const QUADRO: React.CSSProperties = {
  aspectRatio: "3 / 4",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  padding: "var(--espaco)",
  borderRadius: "var(--raio)",
  border: "1px solid var(--linha)",
  background: "var(--superficie)",
};

const FOTO: React.CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "contain",
  borderRadius: "calc(var(--raio) / 2)",
};

export function Moldura({
  url,
  autor,
  legenda,
}: {
  url: string | null;
  autor: string;
  legenda: string | null;
}) {
  return (
    <figure style={{ margin: 0, display: "grid", gap: "calc(var(--espaco) * 1.5)" }}>
      <div style={QUADRO}>
        {/* Sem `src` enquanto a URL não chega: um endereço vazio pinta o ícone
            de imagem quebrada, e moldura vazia é a degradação com dignidade. */}
        {url && (
          <img
            className="feed-amanhece"
            src={url}
            alt={legenda ?? ""}
            loading="lazy"
            decoding="async"
            style={FOTO}
          />
        )}
      </div>

      {/* O crédito é o mecanismo de reconhecimento social (flows N3.4) — e por
          isso fica fora da foto, embaixo, sem disputar com ela. */}
      <figcaption style={{ display: "grid", gap: "calc(var(--espaco) * 0.5)", minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--fonte-titulo)",
            fontSize: "0.64rem",
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

        {legenda && (
          <span
            style={{
              fontSize: "0.8rem",
              lineHeight: 1.4,
              color: "var(--ink-3)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {legenda}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/** O estado de carregamento é a própria moldura, não um giro no meio da tela. */
export function MolduraCarregando() {
  return <div className="feed-esperando" style={QUADRO} aria-hidden="true" />;
}
