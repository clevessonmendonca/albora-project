"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryDaRede } from "../../hooks/use-stories";
import type { MediaUrl } from "@/lib/media";

const DURACAO_MS = 5_000;

type Props = {
  stories: StoryDaRede[];
  urls: Map<string, MediaUrl>;
  initialIndex: number;
  vistos: ReadonlySet<string>;
  onClose: () => void;
  onVisto: (id: string) => void;
};

export function StoryViewer({ stories, urls, initialIndex, onClose, onVisto }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const [progresso, setProgresso] = useState(0);
  const pausadoRef = useRef(false);
  const inicioRef = useRef<number>(Date.now());
  const frameRef = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const story = stories[idx];

  const ir = useCallback(
    (novoIdx: number) => {
      if (novoIdx < 0 || novoIdx >= stories.length) {
        onClose();
        return;
      }
      setIdx(novoIdx);
      setProgresso(0);
      inicioRef.current = Date.now();
    },
    [stories.length, onClose],
  );

  // Marca como visto ao abrir cada story
  useEffect(() => {
    if (story) onVisto(story.id);
  }, [story, onVisto]);

  // Loop de progresso e auto-avanço
  useEffect(() => {
    function tick() {
      if (pausadoRef.current) {
        inicioRef.current = Date.now() - progresso * DURACAO_MS;
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = Date.now() - inicioRef.current;
      const pct = Math.min(elapsed / DURACAO_MS, 1);
      setProgresso(pct);
      if (pct < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ir(idx + 1);
      }
    }
    inicioRef.current = Date.now();
    setProgresso(0);
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ir]);

  // Fecha com Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") ir(idx + 1);
      if (e.key === "ArrowLeft") ir(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, ir, idx]);

  if (!story) return null;

  const thumbUrl = urls.get(story.chaveThumb)?.url;

  const iniciais = story.autor
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={`Story de ${story.autor}`}
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const endX = e.changedTouches[0]?.clientX ?? 0;
        const startX = touchStartX.current ?? endX;
        const delta = endX - startX;
        if (Math.abs(delta) > 40) {
          ir(delta < 0 ? idx + 1 : idx - 1);
        }
        touchStartX.current = null;
      }}
      onPointerDown={() => { pausadoRef.current = true; }}
      onPointerUp={() => { pausadoRef.current = false; inicioRef.current = Date.now() - progresso * DURACAO_MS; }}
    >
      {/* Barras de progresso */}
      <div className="absolute inset-x-3 top-3 z-10 flex gap-1">
        {stories.map((s, i) => (
          <div key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className="h-full rounded-full bg-white transition-none"
              style={{
                width:
                  i < idx ? "100%" : i === idx ? `${progresso * 100}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Cabeçalho */}
      <div className="absolute inset-x-3 top-8 z-10 flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-superficie-alta text-xs font-titulo text-ink">
          {thumbUrl ? (
            <img src={thumbUrl} alt={story.autor} className="size-full object-cover" />
          ) : (
            iniciais
          )}
        </div>
        <span className="flex-1 truncate font-titulo text-sm text-white drop-shadow-sm">
          {story.autor}
        </span>
        <button
          type="button"
          aria-label="Fechar stories"
          onClick={onClose}
          className="grid size-9 place-items-center rounded-full text-white opacity-80 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      </div>

      {/* Imagem */}
      <div className="relative flex-1">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-titulo text-6xl text-white/30">{iniciais}</span>
          </div>
        )}

        {/* Zonas de tap: esquerda = anterior, direita = próxima */}
        <button
          type="button"
          aria-label="Story anterior"
          onClick={() => ir(idx - 1)}
          className="absolute inset-y-0 left-0 w-1/3 bg-transparent"
        />
        <button
          type="button"
          aria-label="Próxima story"
          onClick={() => ir(idx + 1)}
          className="absolute inset-y-0 right-0 w-2/3 bg-transparent"
        />
      </div>
    </div>
  );
}
