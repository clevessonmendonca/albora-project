"use client";

import type { ModoInteracao } from "@albora/core";
import { CabecalhoPublicacao } from "../../../telas/shell-convidado";
import { InteracaoDaFoto } from "../interacao-da-foto";
import type { ResultadoReacao } from "@/lib/usar-reacao";

/**
 * Uma publicação no feed — layout de `TelaFeed` em `/telas`.
 *
 * Cabeçalho com iniciais, foto em 4:5 sem cortar, estrela + comentário embaixo.
 */

const ASPECTO = "4 / 5";

export function Publicacao({
  uploadId,
  interacao,
  reacoes,
  minhaReacao,
  sessaoAutor,
  minha,
  onReacoes,
  onBloqueado,
  url,
  autor,
  legenda,
  lugar,
  ehVideo,
}: {
  uploadId: string;
  interacao: ModoInteracao;
  reacoes?: number;
  minhaReacao?: string | null;
  sessaoAutor?: string;
  minha?: boolean;
  onReacoes?: (resultado: ResultadoReacao) => void;
  onBloqueado?: () => void;
  url: string | null;
  autor: string;
  legenda: string | null;
  lugar?: string | null;
  ehVideo?: boolean;
}) {
  const meta = lugar ? `· ${lugar}` : null;

  return (
    <article style={{ borderTop: "1px solid var(--linha)" }}>
      <div style={{ padding: "0.875rem 0" }}>
        <CabecalhoPublicacao autor={autor} meta={meta} />
      </div>

      <div style={{ position: "relative", aspectRatio: ASPECTO, marginBottom: "0.75rem" }}>
        {url ? (
          ehVideo ? (
            <video
              className="feed-amanhece"
              src={url}
              controls
              playsInline
              preload="metadata"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "var(--bg)",
              }}
            />
          ) : (
            <img
              className="feed-amanhece"
              src={url}
              alt={legenda ?? ""}
              loading="lazy"
              decoding="async"
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                background: "var(--bg)",
              }}
            />
          )
        ) : (
          <div
            className="feed-esperando"
            style={{
              position: "absolute",
              inset: "8%",
              border: "1px solid var(--linha)",
              borderRadius: "var(--raio)",
            }}
          />
        )}
      </div>

      <div style={{ padding: "0 0 0.625rem" }}>
        <InteracaoDaFoto
          uploadId={uploadId}
          interacao={interacao}
          autor={autor}
          {...(reacoes !== undefined ? { reacoesInicial: reacoes } : {})}
          {...(minhaReacao !== undefined ? { minhaInicial: minhaReacao } : {})}
          {...(sessaoAutor ? { sessaoAutor } : {})}
          {...(minha !== undefined ? { minha } : {})}
          {...(onReacoes ? { onReacoes } : {})}
          {...(onBloqueado ? { onBloqueado } : {})}
        />
      </div>

      {legenda && (
        <p style={{ margin: "0 0 1rem", fontSize: "0.84375rem", lineHeight: 1.45, color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink)" }}>{autor}</span> {legenda}
        </p>
      )}
    </article>
  );
}

export function PublicacaoCarregando() {
  return (
    <article aria-hidden style={{ borderTop: "1px solid var(--linha)", paddingBottom: "1rem" }}>
      <div style={{ display: "flex", gap: "0.625rem", padding: "0.875rem 0" }}>
        <span
          className="feed-esperando"
          style={{
            width: "1.875rem",
            height: "1.875rem",
            borderRadius: "50%",
            background: "var(--superficie-alta)",
          }}
        />
        <span
          className="feed-esperando"
          style={{
            width: "6rem",
            height: "0.875rem",
            borderRadius: "var(--raio-pilula)",
            background: "var(--superficie-alta)",
            alignSelf: "center",
          }}
        />
      </div>
      <div
        className="feed-esperando"
        style={{ aspectRatio: ASPECTO, border: "1px solid var(--linha)", borderRadius: "var(--raio)" }}
      />
    </article>
  );
}
