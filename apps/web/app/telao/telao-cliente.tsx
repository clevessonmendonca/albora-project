"use client";

import {
  MODELOS_DE_TELAO,
  PERFIS,
  TETO_DO_CACHE,
  ehMimeVideo,
  modeloCorta,
  podarCache,
  proximaDoTelao,
  type ItemDoTelao,
  type ModeloDeTelao,
} from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../landing/pecas";

/**
 * O telão do salão (spec 010), em duas fases.
 *
 * **Parear:** a TV pede um código, mostra na tela, e faz poll. Alguém que já
 * está no evento — convidado ou anfitrião — digita o código no app e autoriza.
 * O crachá volta num cookie `HttpOnly`; a TV nunca toca nele.
 *
 * **Exibir:** com o crachá no cookie, a TV lê `/api/parede` e roda os oito
 * modelos. 🔴 Nada corta na vertical: todo modelo desenha com `contain`, menos
 * `cheio`, que só recebe foto horizontal — a regra está no CSS e na seleção.
 */

type ItemApi = {
  id: string;
  autor: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
  thumb: string;
  full: string;
  expiraEm: number;
};

const POLL_PAREAMENTO_MS = 3_000;
const POLL_MIDIA_MS = 6_000;
const ROTACAO_MS = 8_000;
const FOLGA_DE_RENOVACAO_MS = 90_000;

const ROTACAO: readonly ModeloDeTelao[] = MODELOS_DE_TELAO;

type Cena = { modelo: ModeloDeTelao; ids: string[] };

export function Telao({ variaveisIniciais }: { variaveisIniciais: Record<string, string> }) {
  const [fase, setFase] = useState<"pareando" | "exibindo">("pareando");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [variaveis, setVariaveis] = useState(variaveisIniciais);

  const itensRef = useRef<Map<string, ItemApi>>(new Map());
  const dimsRef = useRef<Map<string, { largura: number; altura: number }>>(new Map());
  const exibicoesRef = useRef<Map<string, number>>(new Map());
  const rotacaoRef = useRef(0);

  const [cena, setCena] = useState<Cena | null>(null);
  const [carregou, setCarregou] = useState(false);
  const [panico, setPanico] = useState(false);
  const [alternandoPanico, setAlternandoPanico] = useState(false);

  // ── Fase parear ────────────────────────────────────────────────────────
  useEffect(() => {
    if (fase !== "pareando") return;
    let vivo = true;

    const abrir = async () => {
      try {
        const r = await fetch("/api/parede/parear", { method: "POST", credentials: "same-origin" });
        if (!r.ok) return;
        const { code } = (await r.json()) as { code: string };
        if (vivo) setCodigo(code);
      } catch {
        /* rede caiu: o próximo tick tenta de novo */
      }
    };

    const conferir = async () => {
      try {
        const r = await fetch("/api/parede/parear/status", { credentials: "same-origin" });
        if (!r.ok) return;
        const corpo = (await r.json()) as
          | { status: "pendente" }
          | { status: "expirado" }
          | { status: "pronto"; variaveis: Record<string, string> };
        if (!vivo) return;
        if (corpo.status === "pronto") {
          setVariaveis(corpo.variaveis);
          setFase("exibindo");
        } else if (corpo.status === "expirado") {
          setCodigo(null);
          void abrir();
        }
      } catch {
        /* ignora e tenta no próximo tick */
      }
    };

    void abrir();
    const p = window.setInterval(() => void conferir(), POLL_PAREAMENTO_MS);
    return () => {
      vivo = false;
      window.clearInterval(p);
    };
  }, [fase]);

  // ── Fase exibir ────────────────────────────────────────────────────────
  const medir = useCallback((item: ItemApi) => {
    if (dimsRef.current.has(item.id)) return;

    if (ehMimeVideo(item.mime)) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          dimsRef.current.set(item.id, { largura: video.videoWidth, altura: video.videoHeight });
        }
      };
      video.src = item.full;
      return;
    }

    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        dimsRef.current.set(item.id, { largura: img.naturalWidth, altura: img.naturalHeight });
      }
    };
    img.src = item.thumb;
  }, []);

  const puxar = useCallback(async () => {
    let resposta: Response;
    try {
      resposta = await fetch("/api/parede", { credentials: "same-origin", cache: "no-store" });
    } catch {
      return;
    }
    if (resposta.status === 401) {
      // O crachá caiu: volta a parear em vez de mostrar tela morta.
      setFase("pareando");
      return;
    }
    if (!resposta.ok) return;

    const corpo = (await resposta.json()) as {
      itens: Omit<ItemApi, "expiraEm">[];
      expiraEm: number;
      panico?: boolean;
    };
    const agora = Date.now();
    setPanico(corpo.panico === true);

    for (const bruto of corpo.itens) {
      const existente = itensRef.current.get(bruto.id);
      if (existente && existente.expiraEm - agora > FOLGA_DE_RENOVACAO_MS) {
        existente.reacoes = bruto.reacoes;
        continue;
      }
      const item: ItemApi = { ...bruto, expiraEm: corpo.expiraEm };
      itensRef.current.set(bruto.id, item);
      medir(item);
    }

    const podadas = podarCache(
      [...itensRef.current.values()].map((i) => ({
        id: i.id,
        criadaEm: new Date(i.criadaEm),
        exibicoes: 0,
        reacoes: i.reacoes,
        largura: 0,
        altura: 0,
      })),
      TETO_DO_CACHE,
    );
    const vivos = new Set(podadas.map((p) => p.id));
    for (const id of itensRef.current.keys()) {
      if (!vivos.has(id)) {
        itensRef.current.delete(id);
        dimsRef.current.delete(id);
        exibicoesRef.current.delete(id);
      }
    }

    setCarregou(true);
  }, [medir]);

  const paraItemDoTelao = useCallback((): ItemDoTelao[] => {
    const itens: ItemDoTelao[] = [];
    for (const [id, api] of itensRef.current) {
      const dim = dimsRef.current.get(id);
      if (!dim) continue;
      itens.push({
        id,
        criadaEm: new Date(api.criadaEm),
        exibicoes: exibicoesRef.current.get(id) ?? 0,
        reacoes: api.reacoes,
        largura: dim.largura,
        altura: dim.altura,
      });
    }
    return itens;
  }, []);

  const selecionar = useCallback((modelo: ModeloDeTelao, itens: ItemDoTelao[]): string[] => {
    const perfil = PERFIS[modelo];
    if (perfil.fotos === 1) {
      const escolhido = proximaDoTelao(itens, { agora: new Date(), modelo });
      return escolhido ? [escolhido.id] : [];
    }
    const elegiveis = itens
      .filter((i) => !modeloCorta(modelo, i))
      .sort((a, b) => a.exibicoes - b.exibicoes || b.criadaEm.getTime() - a.criadaEm.getTime());
    if (elegiveis.length < perfil.fotos) return [];
    return elegiveis.slice(0, perfil.fotos).map((i) => i.id);
  }, []);

  const girar = useCallback(() => {
    if (panico) return;
    const itens = paraItemDoTelao();
    if (itens.length === 0) return;

    for (let passo = 0; passo < ROTACAO.length; passo++) {
      const modelo = ROTACAO[(rotacaoRef.current + passo) % ROTACAO.length]!;
      const ids = selecionar(modelo, itens);
      if (ids.length > 0) {
        rotacaoRef.current = (rotacaoRef.current + passo + 1) % ROTACAO.length;
        for (const id of ids) {
          exibicoesRef.current.set(id, (exibicoesRef.current.get(id) ?? 0) + 1);
        }
        setCena({ modelo, ids });
        return;
      }
    }
  }, [paraItemDoTelao, selecionar, panico]);

  const alternarPanico = useCallback(async () => {
    setAlternandoPanico(true);
    try {
      const r = await fetch("/api/parede/panico", {
        method: "PATCH",
        credentials: "same-origin",
      });
      if (!r.ok) return;
      const corpo = (await r.json()) as { panico: boolean };
      setPanico(corpo.panico);
      if (!corpo.panico) void puxar();
    } catch {
      /* próximo poll corrige */
    } finally {
      setAlternandoPanico(false);
    }
  }, [puxar]);

  useEffect(() => {
    if (fase !== "exibindo") return;
    void puxar();
    const pApoll = window.setInterval(() => void puxar(), POLL_MIDIA_MS);
    const pRot = window.setInterval(girar, ROTACAO_MS);
    return () => {
      window.clearInterval(pApoll);
      window.clearInterval(pRot);
    };
  }, [fase, puxar, girar]);

  const base: CSSProperties = {
    ...(variaveis as CSSProperties),
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    backgroundColor: "var(--bg)",
    color: "var(--ink)",
    fontFamily: "var(--fonte-corpo)",
  };

  if (fase === "pareando") {
    return (
      <main style={{ ...base, display: "grid", placeItems: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "32ch" }}>
          <p
            style={{
              margin: 0,
              fontSize: "clamp(1rem, 2vw, 1.5rem)",
              color: "var(--ink-2)",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
            }}
          >
            Para ligar o telão
          </p>
          <p
            style={{
              margin: "1.5rem 0",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "clamp(3rem, 12vw, 8rem)",
              letterSpacing: "0.15em",
              color: "var(--acento)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {codigo ?? "······"}
          </p>
          <p style={{ margin: 0, fontSize: "clamp(0.95rem, 1.8vw, 1.35rem)", color: "var(--ink-2)", lineHeight: 1.5 }}>
            No app do evento, abra as configurações e digite este código. Vale para
            quem já entrou na festa — convidado ou anfitrião.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={base}>
      {!panico && cena ? (
        <Palco cena={cena} itemDe={(id) => itensRef.current.get(id)} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <p style={{ fontSize: "1.5rem", color: "var(--ink-3)", textAlign: "center", padding: "2rem" }}>
            {panico
              ? "Telão pausado. Nenhuma foto nova aparece na parede."
              : carregou
                ? "As fotos da festa aparecem aqui."
                : "Conectando ao telão…"}
          </p>
        </div>
      )}

      <button
        type="button"
        aria-label={panico ? "Retomar telão" : "Pausar telão"}
        disabled={alternandoPanico}
        onClick={() => void alternarPanico()}
        style={{
          position: "absolute",
          right: "clamp(0.75rem, 2vw, 1.5rem)",
          bottom: "clamp(0.75rem, 2vw, 1.5rem)",
          minWidth: "44px",
          minHeight: "44px",
          padding: "0.5rem 0.85rem",
          border: "1px solid var(--linha)",
          borderRadius: "var(--raio-pilula)",
          background: "color-mix(in srgb, var(--bg) 72%, transparent)",
          backdropFilter: "blur(6px)",
          color: "var(--ink-2)",
          font: "inherit",
          fontSize: "clamp(0.75rem, 1.2vw, 0.95rem)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          cursor: alternandoPanico ? "wait" : "pointer",
          opacity: alternandoPanico ? 0.6 : 0.85,
        }}
      >
        {alternandoPanico ? "…" : panico ? "Retomar" : "Pausar"}
      </button>
    </main>
  );
}

/** Um modelo desenhado. Toda foto é `contain`, menos dentro de `cheio`. */
function Palco({ cena, itemDe }: { cena: Cena; itemDe: (id: string) => ItemApi | undefined }) {
  const itens = cena.ids.map(itemDe).filter((i): i is ItemApi => Boolean(i));
  if (itens.length === 0) return null;

  const palco: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(1.5rem, 4vw, 4rem)",
    gap: "clamp(0.75rem, 2vw, 2rem)",
  };

  if (cena.modelo === "cheio") {
    const only = itens[0]!;
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <MidiaPalco src={only.full} mime={only.mime} enquadrar="cover" />
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "ambiente") {
    const only = itens[0]!;
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {!ehMimeVideo(only.mime) && (
          <img
            src={only.full}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: "-8%",
              width: "116%",
              height: "116%",
              objectFit: "cover",
              filter: "blur(48px) brightness(0.55)",
            }}
          />
        )}
        <div style={palco}>
          <MidiaPalco src={only.full} mime={only.mime} enquadrar="contain" />
        </div>
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "polaroide" || cena.modelo === "carrossel" || cena.modelo === "tbt") {
    const only = itens[0]!;
    const emoldurado = cena.modelo !== "carrossel";
    return (
      <div style={palco}>
        <figure
          style={{
            margin: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "min(70vw, 60vh)",
            maxHeight: "88vh",
            padding: emoldurado ? "clamp(0.75rem, 1.5vw, 1.5rem)" : 0,
            backgroundColor: emoldurado ? "var(--superficie)" : "transparent",
            ...raio("var(--raio-superficie)"),
            boxShadow: emoldurado
              ? "0 24px 80px -32px color-mix(in srgb, var(--ink) 60%, transparent)"
              : "none",
          }}
        >
          {cena.modelo === "tbt" && (
            <figcaption
              style={{
                alignSelf: "flex-start",
                marginBottom: "0.5rem",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "clamp(0.9rem, 1.6vw, 1.3rem)",
                letterSpacing: "var(--tracking-rotulo)",
                textTransform: "uppercase",
                color: "var(--acento)",
              }}
            >
              Mais cedo, na festa
            </figcaption>
          )}
          <MidiaPalco src={only.full} mime={only.mime} enquadrar="contain" />
          <figcaption
            style={{
              marginTop: "0.75rem",
              alignSelf: "stretch",
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              fontSize: "clamp(0.8rem, 1.4vw, 1.1rem)",
              color: emoldurado ? "var(--ink-2)" : "var(--ink)",
            }}
          >
            <span>{only.autor}</span>
            {only.reacoes > 0 && <span style={{ color: "var(--acento)" }}>★ {only.reacoes}</span>}
          </figcaption>
        </figure>
      </div>
    );
  }

  const colunas = 3;
  const linhas = cena.modelo === "mural" ? 1 : cena.modelo === "colagem" ? 2 : 3;
  return (
    <div
      style={{
        ...palco,
        display: "grid",
        gridTemplateColumns: `repeat(${colunas}, 1fr)`,
        gridTemplateRows: `repeat(${linhas}, 1fr)`,
      }}
    >
      {itens.map((it) => (
        <div
          key={it.id}
          style={{
            position: "relative",
            minWidth: 0,
            minHeight: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MidiaPalco src={it.full} mime={it.mime} enquadrar="contain" />
        </div>
      ))}
    </div>
  );
}

function MidiaPalco({
  src,
  mime,
  enquadrar,
}: {
  src: string;
  mime: string;
  enquadrar: "contain" | "cover";
}) {
  const estilo: CSSProperties = {
    maxWidth: enquadrar === "contain" ? "100%" : undefined,
    maxHeight: enquadrar === "contain" ? "100%" : undefined,
    width: enquadrar === "cover" ? "100%" : "auto",
    height: enquadrar === "cover" ? "100%" : "auto",
    objectFit: enquadrar,
    ...raio("var(--raio-superficie)"),
    display: "block",
  };

  if (ehMimeVideo(mime)) {
    return (
      <video
        src={src}
        autoPlay
        muted
        playsInline
        loop
        style={estilo}
      />
    );
  }

  return <img src={src} alt="" style={estilo} />;
}

function Credito({ autor, reacoes }: { autor: string; reacoes: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "clamp(1rem, 3vw, 3rem)",
        bottom: "clamp(1rem, 3vw, 3rem)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem",
        ...raio("var(--raio-pilula)"),
        backgroundColor: "color-mix(in srgb, var(--bg) 55%, transparent)",
        backdropFilter: "blur(8px)",
        color: "var(--ink)",
        fontSize: "clamp(0.85rem, 1.4vw, 1.15rem)",
      }}
    >
      <span>{autor}</span>
      {reacoes > 0 && <span style={{ color: "var(--acento)" }}>★ {reacoes}</span>}
    </div>
  );
}
