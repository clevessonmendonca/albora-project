"use client";

import {
  MODELOS_DE_TELAO,
  PERFIS,
  TETO_DO_CACHE,
  modeloCorta,
  podarCache,
  proximaDoTelao,
  type ItemDoTelao,
  type ModeloDeTelao,
} from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../../landing/pecas";

/**
 * A parede, no navegador da TV (spec 010).
 *
 * 🔴 Nada corta na vertical. Todo modelo desenha com `object-fit: contain`,
 * menos `cheio`, que sangra e por isso só recebe foto horizontal — e a seleção
 * já filtra as verticais para fora dele. Contain nunca recorta: a regra vermelha
 * está no CSS e na escolha, duas camadas para a mesma invariante.
 *
 * O crachá chega na URL, é lido uma vez e apagado da barra de endereço antes do
 * primeiro quadro. As fotos vêm de `/api/parede` com `Authorization: Bearer`,
 * nunca com o token na querystring.
 */

type ItemApi = {
  id: string;
  autor: string;
  criadaEm: string;
  reacoes: number;
  thumb: string;
  full: string;
  expiraEm: number;
};

const POLL_MS = 6_000;
const ROTACAO_MS = 8_000;
/** Renova a URL antes de ela expirar, com folga para não piscar no meio de uma cena. */
const FOLGA_DE_RENOVACAO_MS = 90_000;

/**
 * A ordem em que os modelos entram. Começa nos de uma foto, que funcionam com o
 * acervo pequeno do início da festa; os de várias só entram quando há fotos que
 * cheguem para preenchê-los. A escolha real do casal (spec 009) substitui esta
 * lista quando o admin existir.
 */
const ROTACAO: readonly ModeloDeTelao[] = MODELOS_DE_TELAO;

type Cena = { modelo: ModeloDeTelao; ids: string[] };

export function Telao({ variaveis }: { variaveis: Record<string, string> }) {
  const crachaRef = useRef<string | null>(null);
  const itensRef = useRef<Map<string, ItemApi>>(new Map());
  const dimsRef = useRef<Map<string, { largura: number; altura: number }>>(new Map());
  const exibicoesRef = useRef<Map<string, number>>(new Map());
  const rotacaoRef = useRef(0);

  const [cena, setCena] = useState<Cena | null>(null);
  const [erro, setErro] = useState<null | "sem-cracha" | "expirou">(null);
  const [carregou, setCarregou] = useState(false);

  const medir = useCallback((item: ItemApi) => {
    if (dimsRef.current.has(item.id)) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        dimsRef.current.set(item.id, { largura: img.naturalWidth, altura: img.naturalHeight });
      }
    };
    img.src = item.thumb;
  }, []);

  const puxar = useCallback(async () => {
    const cracha = crachaRef.current;
    if (!cracha) return;

    let resposta: Response;
    try {
      resposta = await fetch("/api/parede", {
        headers: { authorization: `Bearer ${cracha}` },
        cache: "no-store",
      });
    } catch {
      return; // rede caiu: a TV segue mostrando o cache e tenta no próximo poll.
    }

    if (resposta.status === 401) {
      setErro("expirou");
      return;
    }
    if (!resposta.ok) return;

    const corpo = (await resposta.json()) as { itens: Omit<ItemApi, "expiraEm">[]; expiraEm: number };
    const agora = Date.now();

    for (const bruto of corpo.itens) {
      const existente = itensRef.current.get(bruto.id);
      // Mantém a URL estável enquanto vale: trocá-la a cada poll recarregaria a
      // foto e piscaria no meio da cena. Só renova quando está perto de expirar.
      if (existente && existente.expiraEm - agora > FOLGA_DE_RENOVACAO_MS) {
        existente.reacoes = bruto.reacoes;
        continue;
      }
      const item: ItemApi = { ...bruto, expiraEm: corpo.expiraEm };
      itensRef.current.set(bruto.id, item);
      medir(item);
    }

    // Poda o cache pelas mais recentes: com o cabo arrancado, o que a TV tem
    // para mostrar é o fim da festa, não o começo.
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
      if (!dim) continue; // ainda não medida: não entra até saber se corta.
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
      .sort(
        (a, b) => a.exibicoes - b.exibicoes || b.criadaEm.getTime() - a.criadaEm.getTime(),
      );
    // Modelo de várias fotos só entra quando há como preenchê-lo: um mosaico de
    // nove com três buracos lê como tela quebrada.
    if (elegiveis.length < perfil.fotos) return [];
    return elegiveis.slice(0, perfil.fotos).map((i) => i.id);
  }, []);

  const girar = useCallback(() => {
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
  }, [paraItemDoTelao, selecionar]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cracha = params.get("cracha");
    if (!cracha) {
      setErro("sem-cracha");
      return;
    }
    crachaRef.current = cracha;
    // Tira o crachá da barra de endereço: some do histórico, do referrer e do
    // print de tela que alguém faz da TV.
    window.history.replaceState(null, "", window.location.pathname);

    void puxar();
    const pApoll = window.setInterval(() => void puxar(), POLL_MS);
    const pRot = window.setInterval(girar, ROTACAO_MS);
    return () => {
      window.clearInterval(pApoll);
      window.clearInterval(pRot);
    };
  }, [puxar, girar]);

  const base: CSSProperties = {
    ...(variaveis as CSSProperties),
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    backgroundColor: "var(--bg)",
    color: "var(--ink)",
    fontFamily: "var(--fonte-corpo)",
  };

  if (erro) {
    return (
      <main style={{ ...base, display: "grid", placeItems: "center", padding: "2rem" }}>
        <p style={{ fontSize: "1.5rem", color: "var(--ink-2)", textAlign: "center", maxWidth: "24ch" }}>
          {erro === "sem-cracha"
            ? "Abra o telão pelo link do painel."
            : "O link do telão expirou. Gere outro no painel."}
        </p>
      </main>
    );
  }

  const itemDe = (id: string): ItemApi | undefined => itensRef.current.get(id);

  return (
    <main style={base}>
      {!cena ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <p style={{ fontSize: "1.5rem", color: "var(--ink-3)" }}>
            {carregou ? "As fotos da festa aparecem aqui." : "Conectando ao telão…"}
          </p>
        </div>
      ) : (
        <Palco cena={cena} itemDe={itemDe} />
      )}
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
    const [only] = itens;
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <img
          src={only!.full}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
        <Credito autor={only!.autor} reacoes={only!.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "ambiente") {
    const [only] = itens;
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <img
          src={only!.full}
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
        <div style={palco}>
          <Foto src={only!.full} enquadrar="contain" />
        </div>
        <Credito autor={only!.autor} reacoes={only!.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "polaroide" || cena.modelo === "carrossel" || cena.modelo === "tbt") {
    const [only] = itens;
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
          <Foto src={only!.full} enquadrar="contain" />
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
            <span>{only!.autor}</span>
            {only!.reacoes > 0 && <span style={{ color: "var(--acento)" }}>★ {only!.reacoes}</span>}
          </figcaption>
        </figure>
      </div>
    );
  }

  // mural (3), colagem (5), dump (9): grade que preenche a tela, cada célula
  // contém a foto sem cortar.
  const colunas = cena.modelo === "mural" ? 3 : cena.modelo === "colagem" ? 3 : 3;
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
          <Foto src={it.full} enquadrar="contain" />
        </div>
      ))}
    </div>
  );
}

function Foto({ src, enquadrar }: { src: string; enquadrar: "contain" | "cover" }) {
  return (
    <img
      src={src}
      alt=""
      style={{
        maxWidth: "100%",
        maxHeight: "100%",
        width: "auto",
        height: "auto",
        objectFit: enquadrar,
        ...raio("var(--raio-superficie)"),
        display: "block",
      }}
    />
  );
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
