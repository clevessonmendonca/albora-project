"use client";

import { MissionBanner } from "@albora/ui-web";
import { useCallback, useEffect, useRef } from "react";
import {
  AJUSTES_NEUTROS,
  type AjustesManuais,
  type Preset,
  type TextoComposto,
} from "@albora/core";
import { desenharTextoNoContexto, estiloTextoDoStory } from "@/lib/story-text";
import {
  criarCachePrevia,
  desenharPreviaNoCanvas,
  resetarCachePrevia,
  type CachePrevia,
} from "./editor-lut";

export function EditorCanvas({
  previa,
  escolhido,
  intensidade,
  degradar,
  ajustes = AJUSTES_NEUTROS,
  erro,
  missao,
  texto,
  onMoverTexto,
  onDegradar,
}: {
  previa: ImageBitmap | null;
  escolhido: Preset | null;
  intensidade: number;
  degradar: boolean;
  ajustes?: AjustesManuais;
  erro: string | null;
  missao?: { indice: number; total: number; title: string } | null | undefined;
  /** O texto do composer, se o convidado já escreveu algo (spec 020). */
  texto?: TextoComposto | null;
  /** Arrastar sobre a foto reposiciona o texto — `x`/`y` chegam já em 0–1. */
  onMoverTexto?: (x: number, y: number) => void;
  onDegradar: () => void;
}) {
  const telaPrevia = useRef<HTMLCanvasElement>(null);
  const cache = useRef<CachePrevia>(criarCachePrevia());
  const quadroAgendado = useRef<number | null>(null);
  const arrastando = useRef<number | null>(null);

  useEffect(() => {
    resetarCachePrevia(cache.current);
  }, [previa]);

  const desenharPrevia = useCallback(() => {
    const tela = telaPrevia.current;
    if (!tela || !previa) return;

    desenharPreviaNoCanvas({
      tela,
      previa,
      escolhido,
      intensidade,
      degradar,
      ajustes,
      cache: cache.current,
      onDegradar,
    });

    // Texto entra depois da cor, no mesmo canvas — mesma função que compõe a foto final (`webDrawer.compor`), pra prévia e story não divergirem de posição.
    if (texto && texto.conteudo.trim()) {
      const ctx = tela.getContext("2d");
      if (ctx) desenharTextoNoContexto(ctx, tela.width, tela.height, texto, estiloTextoDoStory());
    }
  }, [previa, escolhido, intensidade, degradar, ajustes, onDegradar, texto]);

  useEffect(() => {
    // Um desenho por quadro, sempre o último — sem essa coalescência, o slider dispara dezenas de varreduras/s e o Android acumula trabalho até a prévia parecer morta.
    quadroAgendado.current = requestAnimationFrame(() => {
      quadroAgendado.current = null;
      desenharPrevia();
    });

    return () => {
      if (quadroAgendado.current !== null) {
        cancelAnimationFrame(quadroAgendado.current);
        quadroAgendado.current = null;
      }
    };
  }, [desenharPrevia]);

  function moverPara(clientX: number, clientY: number) {
    const tela = telaPrevia.current;
    if (!tela || !onMoverTexto) return;

    const caixa = tela.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return;

    const x = Math.min(1, Math.max(0, (clientX - caixa.left) / caixa.width));
    const y = Math.min(1, Math.max(0, (clientY - caixa.top) / caixa.height));
    onMoverTexto(x, y);
  }

  function aoPressionar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!texto || !onMoverTexto) return;
    arrastando.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    moverPara(e.clientX, e.clientY);
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (arrastando.current !== e.pointerId) return;
    moverPara(e.clientX, e.clientY);
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (arrastando.current !== e.pointerId) return;
    arrastando.current = null;
  }

  return (
    <section className="relative grid place-items-center overflow-hidden px-5">
      {missao && (
        <div className="banner-missao absolute inset-x-4 top-4 z-[1]">
          <MissionBanner index={missao.indice} total={missao.total} title={missao.title} />
        </div>
      )}
      {erro ? (
        <div className="max-w-[28ch] text-center">
          <p role="alert" className="m-0 text-[0.94rem] leading-[1.68] text-ink-2">
            {erro}
          </p>
        </div>
      ) : (
        // A foto é o palco (brief): raio-media + bg-superficie-alta é a mesma
        // moldura dos cartões de mídia da superfície do convidado (`PhotoCard`)
        // — não uma genérica. Sem sombra: a section-pai tem overflow-hidden,
        // que cortaria o blur da `elev-*` em vez de mostrá-lo.
        <canvas
          ref={telaPrevia}
          className={`max-h-full max-w-full rounded-media bg-superficie-alta${texto ? " touch-none" : ""}`}
          onPointerDown={aoPressionar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
        />
      )}
      <style>{ESTILO_MISSAO}</style>
    </section>
  );
}

/** Mesmo tratamento de entrada da missão que a câmera (Task 4): fade + leve descida na curva-base, nunca mola (reservada a toque). Duplicado por tela — candidato a utilitário `.reveal` já registrado no ledger da onda. */
const ESTILO_MISSAO = `
@keyframes editor-missao-entrar {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to   { opacity: 1; transform: none; }
}
.banner-missao { animation: editor-missao-entrar var(--tempo-lento) var(--curva) both; }

@media (prefers-reduced-motion: reduce) {
  .banner-missao { animation: none; }
}
`;
