"use client";

import type { ItemDaGaleria } from "@albora/core";
import { ehMimeVideo } from "@albora/core";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { filaWeb } from "@/lib/fila";
import { usarCompartilhar } from "@/lib/usar-compartilhar";
import { usarGaleria } from "@/lib/usar-galeria";
import { BarraDeAbas } from "../barra-de-abas";
import {
  BotaoPrimario,
  BotaoSecundario,
  CabecalhoConvidado,
  ChaoConvidado,
  MioloConvidado,
  RecadoErro,
} from "../../../telas/shell-convidado";
import { Pilula } from "../../../telas/pecas-de-tela";

function rotuloEstado(estado: ItemDaGaleria["estado"]): string {
  if (estado === "subindo") return "Subindo…";
  if (estado === "falhou") return "Não subiu";
  return "";
}

function MiniaturaMinhas({
  ehVideo,
  url,
  urlVideo,
  pendente,
}: {
  ehVideo: boolean;
  url: string | undefined;
  urlVideo: string | null | undefined;
  pendente: boolean;
}) {
  const cobertura: CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  };

  if (ehVideo && pendente && url) {
    return <video src={url} muted playsInline preload="metadata" style={cobertura} />;
  }

  if (ehVideo && url) {
    return (
      <>
        <img src={url} alt="" loading="lazy" decoding="async" style={cobertura} />
        <IndicadorVideo />
      </>
    );
  }

  if (ehVideo && urlVideo) {
    return <video src={urlVideo} muted playsInline preload="metadata" style={cobertura} />;
  }

  if (url) {
    return <img src={url} alt="" loading="lazy" decoding="async" style={cobertura} />;
  }

  return <div style={{ width: "100%", height: "100%", background: "var(--linha)" }} />;
}

function IndicadorVideo() {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        background:
          "linear-gradient(to top, color-mix(in srgb, var(--bg) 40%, transparent), transparent 55%)",
      }}
    >
      <span
        style={{
          width: "2rem",
          height: "2rem",
          borderRadius: "50%",
          border: "1px solid var(--linha)",
          background: "color-mix(in srgb, var(--bg) 72%, transparent)",
          display: "grid",
          placeItems: "center",
          fontSize: "0.75rem",
        }}
      >
        ▶
      </span>
    </span>
  );
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
  const [mimesLocais, setMimesLocais] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelado = false;
    const criadas: string[] = [];

    void (async () => {
      const fila = await filaWeb.listar();
      const mapa = new Map<string, string>();
      const mimes = new Map<string, string>();
      for (const item of fila) {
        if (item.eventoId !== eventoId) continue;
        if (item.corpo.tipo === "blob") {
          const url = URL.createObjectURL(item.corpo.blob);
          criadas.push(url);
          mapa.set(item.id, url);
          mimes.set(item.id, item.mime);
        }
      }
      if (!cancelado) {
        setLocais(mapa);
        setMimesLocais(mimes);
      }
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

  const idsFotosEnviadas = useMemo(
    () => galeria.itens.filter((i) => i.estado === "enviada" && !galeria.ehVideo(i)).map((i) => i.id),
    [galeria.itens, galeria.ehVideo],
  );

  return (
    <>
      <ChaoConvidado>
        <MioloConvidado>
          <CabecalhoConvidado
            titulo="Minhas fotos"
            acao={
              !galeria.carregando ? (
                <Pilula>{resumo}</Pilula>
              ) : (
                <Pilula>Carregando…</Pilula>
              )
            }
          />

          {galeria.falha && <RecadoErro>Não deu para carregar agora.</RecadoErro>}

          {compartilhar.erro && <RecadoErro>{compartilhar.erro}</RecadoErro>}

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
              gap: "2px",
            }}
          >
          {galeria.itens.map((item) => {
            const url = item.estado === "enviada" ? galeria.urlDe(item) : locais.get(item.id);
            const urlVideo =
              item.estado === "enviada" ? galeria.urlCheia(item) : locais.get(item.id);
            const ehVideo =
              item.estado === "enviada"
                ? galeria.ehVideo(item)
                : ehMimeVideo(mimesLocais.get(item.id) ?? "");
            const rotulo = rotuloEstado(item.estado);

            return (
              <li key={item.id} style={{ position: "relative", aspectRatio: "1 / 1" }}>
                {item.estado === "enviada" && (
                  <button
                    type="button"
                    aria-label={ehVideo ? "Compartilhar este vídeo" : "Compartilhar esta foto"}
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
                  <MiniaturaMinhas
                    ehVideo={ehVideo}
                    url={url ?? undefined}
                    urlVideo={urlVideo ?? undefined}
                    pendente={item.estado !== "enviada"}
                  />
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

        {idsFotosEnviadas.length >= 2 && (
          <div style={{ marginTop: "1.25rem" }}>
            <BotaoSecundario
              desabilitado={compartilhar.colagemIds !== null}
              onClick={() => void compartilhar.compartilharColagem(idsFotosEnviadas.slice(0, 4))}
            >
              {compartilhar.colagemIds ? "Montando colagem…" : "Colagem da noite"}
            </BotaoSecundario>
          </div>
        )}

        {galeria.resumo.falhou > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <BotaoPrimario
              desabilitado={galeria.drenando}
              onClick={() => void galeria.tentarDeNovo()}
            >
              {galeria.drenando ? "Tentando…" : "Tentar de novo"}
            </BotaoPrimario>
          </div>
        )}
        </MioloConvidado>
      </ChaoConvidado>

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
