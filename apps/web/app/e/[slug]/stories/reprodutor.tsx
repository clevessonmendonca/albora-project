"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UrlDeMidia } from "@/lib/midia";
import { rotuloDeHora } from "@/lib/agrupar-por-hora";
import { Quadro } from "./quadro";
import type { ItemDoFeed } from "./usar-stories";

/**
 * A hora correndo em tela cheia.
 *
 * O avanço é por **toque**: direita avança, esquerda volta. Deslizar existe
 * junto — nunca no lugar — porque quem está de pé com um copo na outra mão
 * toca, não desliza. Toque longo segura a foto onde está.
 *
 * A tela acaba de propósito. Quando a hora termina, ela devolve a pessoa para a
 * lista, onde a ação primária é a câmera: stories existe para disparar a próxima
 * foto ([ADR 0009](../../../../docs/adr/0009-app-social-do-convidado.md)), não
 * para prender.
 */

const DURACAO_MS = 5_000;
/** Acima disto o dedo está segurando, não tocando. */
const LIMIAR_LONGO_MS = 220;
/** Abaixo disto é tremida de dedo, não deslize. */
const DESLIZE_MIN_PX = 44;
/** Deslize e toque longo abafam o clique que vem logo atrás — só ele. */
const SUPRESSAO_MS = 600;

export function Reprodutor({
  itens,
  indice,
  hora,
  urls,
  slug,
  movimentoReduzido,
  onIr,
  onSair,
}: {
  itens: ItemDoFeed[];
  indice: number;
  hora: number;
  urls: Map<string, UrlDeMidia>;
  slug: string;
  movimentoReduzido: boolean;
  onIr: (indice: number) => void;
  onSair: () => void;
}) {
  const [segurando, setSegurando] = useState(false);

  const gesto = useRef({ x: 0, y: 0, longo: false });
  const cronometroLongo = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suprimirAte = useRef(0);
  const precarregadas = useRef<HTMLImageElement[]>([]);

  const atual = itens[indice];
  const urlThumb = atual ? urls.get(atual.chaveThumb)?.url : undefined;
  const urlCheia = atual ? urls.get(atual.chaveFull)?.url : undefined;
  const temImagem = Boolean(urlThumb ?? urlCheia);

  function avancar() {
    if (indice + 1 < itens.length) onIr(indice + 1);
    else onSair();
  }

  function voltar() {
    if (indice > 0) onIr(indice - 1);
  }

  /**
   * O arquivo cheio das próximas entra no cache do navegador enquanto a atual
   * está na tela. É isto que faz o toque parecer instantâneo: sem o
   * pré-carregamento, cada avanço começa uma conexão nova e a foto aparece
   * depois do gesto.
   */
  useEffect(() => {
    const alvos: string[] = [];
    for (const passo of [1, 2]) {
      const proximo = itens[indice + passo];
      if (!proximo) continue;
      const url = urls.get(proximo.chaveFull)?.url ?? urls.get(proximo.chaveThumb)?.url;
      if (url) alvos.push(url);
    }

    if (alvos.length === 0) return;

    // Guardadas numa ref: uma `Image` sem referência viva pode ser coletada
    // antes de a resposta chegar, e aí o pré-carregamento não carregou nada.
    precarregadas.current = alvos.map((url) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      return img;
    });
  }, [indice, itens, urls]);

  /**
   * Avanço automático. Só começa quando há o que olhar — contar cinco segundos
   * de tela preta não é ritmo, é a foto perdida — e para no toque longo.
   */
  useEffect(() => {
    if (movimentoReduzido || segurando || !temImagem) return;

    const id = setTimeout(() => {
      if (indice + 1 < itens.length) onIr(indice + 1);
      else onSair();
    }, DURACAO_MS);

    return () => clearTimeout(id);
  }, [movimentoReduzido, segurando, temImagem, indice, itens.length, onIr, onSair]);

  useEffect(() => {
    return () => {
      if (cronometroLongo.current) clearTimeout(cronometroLongo.current);
    };
  }, []);

  function soltar() {
    if (cronometroLongo.current) {
      clearTimeout(cronometroLongo.current);
      cronometroLongo.current = null;
    }
    setSegurando(false);
  }

  function pressionou(ev: React.PointerEvent) {
    gesto.current = { x: ev.clientX, y: ev.clientY, longo: false };
    if (cronometroLongo.current) clearTimeout(cronometroLongo.current);
    cronometroLongo.current = setTimeout(() => {
      gesto.current.longo = true;
      setSegurando(true);
    }, LIMIAR_LONGO_MS);
  }

  function largou(ev: React.PointerEvent) {
    const { x, y, longo } = gesto.current;
    soltar();

    const dx = ev.clientX - x;
    const dy = ev.clientY - y;

    if (longo) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      return;
    }

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > DESLIZE_MIN_PX) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      // Para baixo fecha. É o gesto que a pessoa já traz de outros aplicativos,
      // e ele não substitui o botão de sair — só chega antes dele.
      if (dy > 0) onSair();
      return;
    }

    if (Math.abs(dx) > DESLIZE_MIN_PX) {
      suprimirAte.current = Date.now() + SUPRESSAO_MS;
      if (dx < 0) avancar();
      else voltar();
    }
  }

  /** O toque em si é o clique do botão da zona — é ele que o teclado também aciona. */
  function tocou(acao: () => void) {
    return () => {
      if (Date.now() < suprimirAte.current) return;
      acao();
    };
  }

  /**
   * Teclado no documento, e não no elemento: enquanto o foco não estiver dentro
   * da tela cheia — e depois de um toque ele fica no `body` — um `onKeyDown` de
   * elemento nunca recebe o `Escape`, que é o atalho de sair.
   */
  useEffect(() => {
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "ArrowRight") {
        if (indice + 1 < itens.length) onIr(indice + 1);
        else onSair();
      } else if (ev.key === "ArrowLeft") {
        if (indice > 0) onIr(indice - 1);
      } else if (ev.key === "Escape") {
        onSair();
      } else {
        return;
      }
      ev.preventDefault();
    }

    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [indice, itens.length, onIr, onSair]);

  // Véu derivado de token, nunca `rgba()` literal. E sombra de texto por baixo
  // dele: `color-mix` não existe em navegador de 2019, e é justamente lá que a
  // pessoa está lendo um crédito sobre foto clara às 22h.
  const veuTopo = "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 86%, transparent), transparent)";
  const veuBase = "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)";
  const sombraDeTexto = "0 1px 4px var(--bg)";

  return (
    <main
      onPointerDown={pressionou}
      onPointerUp={largou}
      onPointerCancel={soltar}
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        // `manipulation`, e não `none`: mata o zoom de duplo toque, que aqui é
        // toque duplo para avançar, e **preserva o pinça-para-ampliar** — a tia
        // de 58 anos amplia a foto para achar quem está na mesa.
        touchAction: "manipulation",
        userSelect: "none",
      }}
    >
      <style>{`
        .st-zona { appearance: none; background: transparent; border: none; padding: 0; cursor: pointer; }
        .st-zona:focus-visible { outline: 1px solid var(--acento); outline-offset: -8px; }
        @keyframes st-correr { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @media (prefers-reduced-motion: reduce) {
          .st-corrida { animation: none !important; transform: scaleX(1); }
        }
      `}</style>

      {atual && (
        <Quadro
          urlThumb={urlThumb}
          urlCheia={urlCheia}
          alt={`Foto de ${atual.autor}`}
          movimentoReduzido={movimentoReduzido}
        />
      )}

      <header
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gap: "0.75rem",
          padding: "max(0.75rem, env(safe-area-inset-top)) 1rem 1.5rem",
          background: veuTopo,
        }}
      >
        {/* Filete, não barra: 1,5px, sem raio, um segmento por foto da hora. */}
        <div style={{ display: "flex", gap: "3px", height: "1.5px" }} aria-hidden>
          {itens.map((item, i) => (
            <div key={item.id} style={{ flex: 1, background: "var(--linha)", overflow: "hidden" }}>
              <div
                className={i === indice ? "st-corrida" : undefined}
                style={{
                  height: "100%",
                  background: "var(--acento)",
                  transformOrigin: "left",
                  transform: i < indice || (i === indice && (movimentoReduzido || !temImagem))
                    ? "scaleX(1)"
                    : "scaleX(0)",
                  animation:
                    i === indice && !movimentoReduzido && temImagem
                      ? `st-correr ${DURACAO_MS}ms linear forwards`
                      : undefined,
                  animationPlayState: segurando ? "paused" : "running",
                }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.7rem",
              fontWeight: 400,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              textShadow: sombraDeTexto,
            }}
          >
            {rotuloDeHora(hora)}
          </p>

          {/* Sair tem de ser óbvio. Tela cheia sem saída clara é armadilha. */}
          <button
            type="button"
            onClick={onSair}
            style={{
              font: "inherit",
              fontSize: "0.9rem",
              minHeight: "48px",
              minWidth: "48px",
              padding: "0 0.75rem",
              borderRadius: "var(--raio)",
              border: "1px solid var(--linha)",
              background: "transparent",
              color: "var(--ink)",
              cursor: "pointer",
              textShadow: sombraDeTexto,
            }}
          >
            Fechar
          </button>
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <button
          type="button"
          className="st-zona"
          aria-label="Foto anterior"
          onClick={tocou(voltar)}
          style={{ flex: "0 0 34%" }}
        />
        <button
          type="button"
          className="st-zona"
          aria-label="Próxima foto"
          onClick={tocou(avancar)}
          style={{ flex: 1 }}
        />
      </div>

      <footer
        style={{
          position: "relative",
          zIndex: 2,
          display: "grid",
          gap: "1rem",
          padding: "2rem 1rem max(1.25rem, env(safe-area-inset-bottom))",
          background: veuBase,
        }}
      >
        {atual && (
          <div style={{ display: "grid", gap: "0.3rem", textShadow: sombraDeTexto }}>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "0.66rem",
                fontWeight: 400,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--ink)",
              }}
            >
              {atual.autor}
              {atual.lugar ? ` · ${atual.lugar}` : ""}
            </p>
            {atual.legenda && (
              <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
                {atual.legenda}
              </p>
            )}
          </div>
        )}

        {/* Fixo e sempre visível — é o plano de risco da própria task 007: esta
            tela não otimiza tempo de tela, ela devolve a pessoa para a câmera. */}
        <Link
          href={`/e/${slug}/foto`}
          style={{
            display: "grid",
            placeItems: "center",
            minHeight: "54px",
            padding: "0 1.75rem",
            borderRadius: "var(--raio)",
            background: "var(--acento)",
            color: "var(--bg)",
            fontSize: "1.02rem",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Tirar foto
        </Link>
      </footer>
    </main>
  );
}
