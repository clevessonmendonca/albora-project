"use client";

import { MissionBanner } from "@albora/ui-web";
import { useCallback, useEffect, useRef } from "react";
import {
  AJUSTES_NEUTROS,
  type AjustesManuais,
  type Preset,
} from "@albora/core";
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
  onDegradar,
}: {
  previa: ImageBitmap | null;
  escolhido: Preset | null;
  intensidade: number;
  degradar: boolean;
  ajustes?: AjustesManuais;
  erro: string | null;
  missao?: { indice: number; total: number; title: string } | null | undefined;
  onDegradar: () => void;
}) {
  const telaPrevia = useRef<HTMLCanvasElement>(null);
  const cache = useRef<CachePrevia>(criarCachePrevia());
  const quadroAgendado = useRef<number | null>(null);

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
  }, [previa, escolhido, intensidade, degradar, ajustes, onDegradar]);

  useEffect(() => {
    // Um desenho por quadro, sempre o último. Arrastar um slider dispara
    // dezenas de eventos por segundo e cada desenho varre a imagem inteira:
    // sem a coalescência o Android de entrada acumula trabalho e a prévia
    // parece morta, que é o convidado desistindo da foto.
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

  return (
    <section className="relative grid place-items-center overflow-hidden px-5">
      {missao && (
        <div className="absolute inset-x-3.5 top-3.5 z-[1]">
          <MissionBanner index={missao.indice} total={missao.total} title={missao.title} />
        </div>
      )}
      {erro ? (
        <p role="alert" className="text-center leading-[1.68] text-critico">
          {erro}
        </p>
      ) : (
        <canvas ref={telaPrevia} className="max-h-full max-w-full rounded-superficie" />
      )}
    </section>
  );
}
