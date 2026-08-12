"use client";

import type { ItemDaGaleria } from "@albora/core";
import { useEffect, useMemo, useState } from "react";
import { filaWeb } from "@/lib/fila";
import { usarCompartilhar } from "@/lib/usar-compartilhar";
import { usarGaleria } from "@/lib/usar-galeria";
import { BarraDeAbas } from "../barra-de-abas";

function rotuloEstado(estado: ItemDaGaleria["estado"]): string {
  if (estado === "subindo") return "Subindo…";
  if (estado === "falhou") return "Não subiu";
  return "";
}

export function PaginaMinhas({
  slug,
  eventoId,
  sessaoId,
}: {
  slug: string;
  eventoId: string;
  sessaoId: string;
}) {
  const galeria = usarGaleria(eventoId);
  const compartilhar = usarCompartilhar(eventoId, sessaoId);
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

  const idsEnviadas = useMemo(
    () => galeria.itens.filter((i) => i.estado === "enviada").map((i) => i.id),
    [galeria.itens],
  );

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

        {compartilhar.erro && (
          <p style={{ color: "var(--critico)", fontSize: "0.9rem", marginBottom: "1rem" }}>
            {compartilhar.erro}
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
                {item.estado === "enviada" && (
                  <button
                    type="button"
                    aria-label="Compartilhar esta foto"
                    disabled={compartilhar.compartilhandoId === item.id}
                    onClick={() => void compartilhar.compartilhar(item.id)}
                    style={{
                      position: "absolute",
                      bottom: "0.25rem",
                      left: "0.25rem",
                      zIndex: 1,
                      minWidth: "28px",
                      minHeight: "28px",
                      padding: "0.2rem 0.45rem",
                      border: "none",
                      borderRadius: "var(--raio-pilula)",
                      background: "color-mix(in srgb, var(--bg) 90%, transparent)",
                      color: "var(--ink-2)",
                      fontSize: "0.625rem",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: compartilhar.compartilhandoId === item.id ? "wait" : "pointer",
                    }}
                  >
                    {compartilhar.compartilhandoId === item.id ? "…" : "Compartilhar"}
                  </button>
                )}
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

        {idsEnviadas.length >= 2 && (
          <button
            type="button"
            disabled={compartilhar.colagemIds !== null}
            onClick={() => void compartilhar.compartilharColagem(idsEnviadas.slice(0, 4))}
            style={{
              marginTop: "calc(var(--espaco) * 3)",
              width: "100%",
              minHeight: "44px",
              border: "1px solid var(--linha)",
              borderRadius: "var(--raio-pilula)",
              background: "var(--superficie)",
              color: "var(--ink)",
              font: "inherit",
              cursor: compartilhar.colagemIds ? "wait" : "pointer",
            }}
          >
            {compartilhar.colagemIds ? "Montando colagem…" : "Colagem da noite"}
          </button>
        )}

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

      {(compartilhar.pedindoConsentimento || compartilhar.pedindoColagem) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="consentimento-externo-titulo"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20,
            display: "grid",
            placeItems: "end center",
            padding: "1rem",
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            background: "color-mix(in srgb, var(--noite) 40%, transparent)",
          }}
        >
          <div
            style={{
              width: "min(24rem, 100%)",
              padding: "1.25rem",
              borderRadius: "var(--raio-superficie)",
              background: "var(--superficie)",
              border: "1px solid var(--linha)",
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <h2
              id="consentimento-externo-titulo"
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.0625rem",
                fontWeight: 400,
              }}
            >
              Compartilhar para fora
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
              Ao compartilhar, a foto sai do evento com uma moldura. Quem receber pode guardar
              para sempre — não dá para desfazer depois.
            </p>
            <label
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                fontSize: "0.875rem",
                color: "var(--ink-2)",
              }}
            >
              <input type="checkbox" id="nome-na-moldura" defaultChecked />
              <span>Incluir meu primeiro nome na moldura</span>
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => compartilhar.cancelarConsentimento()}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  border: "1px solid var(--linha)",
                  borderRadius: "var(--raio-pilula)",
                  background: "transparent",
                  color: "var(--ink)",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("nome-na-moldura") as HTMLInputElement | null;
                  const nome = el?.checked ?? false;
                  if (compartilhar.pedindoColagem) {
                    void compartilhar.confirmarConsentimentoColagem(
                      compartilhar.pedindoColagem,
                      nome,
                    );
                  } else if (compartilhar.pedindoConsentimento) {
                    void compartilhar.confirmarConsentimento(
                      compartilhar.pedindoConsentimento,
                      nome,
                    );
                  }
                }}
                style={{
                  flex: 1,
                  minHeight: "44px",
                  border: "none",
                  borderRadius: "var(--raio-pilula)",
                  background: "var(--acento)",
                  color: "var(--sobre-acento)",
                  font: "inherit",
                  cursor: "pointer",
                }}
              >
                Aceitar e compartilhar
              </button>
            </div>
          </div>
        </div>
      )}

      <BarraDeAbas slug={slug} ativa="minhas" />
    </>
  );
}
