"use client";

import type { ItemDaGaleria } from "@albora/core";
import { useEffect, useMemo, useState } from "react";
import { filaWeb } from "@/lib/fila";
import { usarGaleria } from "@/lib/usar-galeria";
import { BarraDeAbas } from "../barra-de-abas";

function rotuloEstado(estado: ItemDaGaleria["estado"]): string {
  if (estado === "subindo") return "Subindo…";
  if (estado === "falhou") return "Não subiu";
  return "";
}

export function PaginaMinhas({ slug, eventoId }: { slug: string; eventoId: string }) {
  const galeria = usarGaleria(eventoId);
  const [locais, setLocais] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelado = false;
    const criadas: string[] = [];

    void (async () => {
      const fila = await filaWeb.listar();
      const mapa = new Map<string, string>();
      for (const item of fila) {
        if (item.eventoId !== eventoId) continue;
        if (item.corpo.tipo === "blob") {
          const url = URL.createObjectURL(item.corpo.blob);
          criadas.push(url);
          mapa.set(item.id, url);
        }
      }
      if (!cancelado) setLocais(mapa);
    })();

    return () => {
      cancelado = true;
      for (const url of criadas) URL.revokeObjectURL(url);
    };
  }, [eventoId, galeria.itens]);

  const resumo = useMemo(() => {
    if (galeria.resumo.subindo > 0) {
      return `${galeria.resumo.enviadas} enviadas · ${galeria.resumo.subindo} subindo`;
    }
    return `${galeria.resumo.total} ${galeria.resumo.total === 1 ? "foto" : "fotos"}`;
  }, [galeria.resumo]);

  return (
    <>
      <main
        style={{
          minHeight: "100dvh",
          padding: "calc(var(--espaco) * 4) calc(var(--espaco) * 3)",
          paddingBottom: "calc(6rem + env(safe-area-inset-bottom))",
        }}
      >
        <header style={{ marginBottom: "calc(var(--espaco) * 4)" }}>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--fonte-titulo)",
              fontSize: "1.25rem",
              fontWeight: 400,
              letterSpacing: "0.04em",
              color: "var(--ink)",
            }}
          >
            Minhas fotos
          </h1>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "var(--ink-3)" }}>
            {galeria.carregando ? "Carregando…" : resumo}
          </p>
        </header>

        {galeria.falha && (
          <p style={{ color: "var(--critico)", fontSize: "0.9rem" }}>
            Não deu para carregar agora.
          </p>
        )}

        {!galeria.carregando && galeria.itens.length === 0 && (
          <p style={{ color: "var(--ink-3)", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Ainda não há fotos suas aqui. Use o botão da câmera para mandar a primeira.
          </p>
        )}

        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.375rem",
          }}
        >
          {galeria.itens.map((item) => {
            const url = item.estado === "enviada" ? galeria.urlDe(item) : locais.get(item.id);
            const rotulo = rotuloEstado(item.estado);

            return (
              <li key={item.id} style={{ position: "relative", aspectRatio: "1 / 1" }}>
                <button
                  type="button"
                  aria-label="Remover esta foto"
                  disabled={galeria.removendoId === item.id}
                  onClick={() => void galeria.remover(item)}
                  style={{
                    position: "absolute",
                    top: "0.25rem",
                    right: "0.25rem",
                    zIndex: 1,
                    minWidth: "28px",
                    minHeight: "28px",
                    padding: 0,
                    border: "none",
                    borderRadius: "50%",
                    background: "color-mix(in srgb, var(--bg) 90%, transparent)",
                    color: "var(--ink-2)",
                    fontSize: "0.75rem",
                    cursor: galeria.removendoId === item.id ? "wait" : "pointer",
                  }}
                >
                  ×
                </button>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "var(--raio)",
                    overflow: "hidden",
                    background: "var(--superficie)",
                    border: "1px solid var(--linha)",
                  }}
                >
                  {url ? (
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "var(--linha)" }} />
                  )}
                </div>

                {rotulo && (
                  <span
                    style={{
                      position: "absolute",
                      insetInline: "0.25rem",
                      bottom: "0.25rem",
                      padding: "0.2rem 0.35rem",
                      fontSize: "0.625rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      textAlign: "center",
                      borderRadius: "var(--raio-pilula)",
                      background: "color-mix(in srgb, var(--bg) 88%, transparent)",
                      color: item.estado === "falhou" ? "var(--critico)" : "var(--ink-2)",
                    }}
                  >
                    {rotulo}
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {galeria.resumo.falhou > 0 && (
          <button
            type="button"
            disabled={galeria.drenando}
            onClick={() => void galeria.tentarDeNovo()}
            style={{
              marginTop: "calc(var(--espaco) * 4)",
              width: "100%",
              minHeight: "44px",
              border: "none",
              borderRadius: "var(--raio-pilula)",
              background: "var(--acento)",
              color: "var(--sobre-acento)",
              font: "inherit",
              cursor: galeria.drenando ? "wait" : "pointer",
            }}
          >
            {galeria.drenando ? "Tentando…" : "Tentar de novo"}
          </button>
        )}
      </main>

      <BarraDeAbas slug={slug} ativa="minhas" />
    </>
  );
}
