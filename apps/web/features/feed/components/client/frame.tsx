"use client";

import { cn } from "@albora/ui-web";
import { useEffect, useRef, useState, type RefObject } from "react";

const CLASSE_INTEIRA =
  "absolute inset-0 size-full object-contain";
const CLASSE_FUNDO_DESFOCADO =
  "absolute inset-0 size-full scale-[1.18] object-cover blur-[44px] saturate-[0.7] brightness-[0.42]";
const CLASSE_PLACEHOLDER =
  "absolute inset-x-[8%] inset-y-[12%] rounded-token border border-linha";
const CLASSE_TRANSICAO = "[transition:opacity_var(--tempo-rapido)_var(--curva)]";

/** `contain` + fundo desfocado — foto horizontal não perde as laterais e não gera tarjas pretas (modelo Ambiente, docs/flows.md §5.0). */
export function Frame({
  urlThumb,
  urlCheia,
  alt,
  movimentoReduzido,
  isVideo = false,
  onFim,
}: {
  urlThumb: string | undefined;
  urlCheia: string | undefined;
  alt: string;
  movimentoReduzido: boolean;
  isVideo?: boolean;
  onFim?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cheiaPronta, setCheiaPronta] = useState(false);
  const [thumbCaiu, setThumbCaiu] = useState(false);
  const [cheiaCaiu, setCheiaCaiu] = useState(false);

  useEffect(() => setThumbCaiu(false), [urlThumb]);

  useEffect(() => {
    setCheiaPronta(false);
    setCheiaCaiu(false);
  }, [urlCheia, isVideo]);

  useEffect(() => {
    if (!isVideo || !urlCheia || movimentoReduzido) return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      /* autoplay bloqueado: o convidado ainda pode tocar na tela */
    });
  }, [isVideo, urlCheia, movimentoReduzido]);

  const thumb = thumbCaiu ? undefined : urlThumb;
  const cheia = cheiaCaiu ? undefined : urlCheia;
  const fundo = thumb ?? (isVideo ? undefined : cheia);
  const transicao = movimentoReduzido ? undefined : CLASSE_TRANSICAO;

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      {fundo && (
        <img
          src={fundo}
          alt=""
          aria-hidden
          {...(isVideo ? { onError: () => setThumbCaiu(true) } : {})}
          className={CLASSE_FUNDO_DESFOCADO}
        />
      )}

      {isVideo ? (
        <VideoLayer
          videoRef={videoRef}
          src={cheia}
          alt={alt}
          transicao={transicao}
          pronta={cheiaPronta}
          onPronta={() => setCheiaPronta(true)}
          onCaiu={() => setCheiaCaiu(true)}
          {...(onFim ? { onFim } : {})}
        />
      ) : (
        <PhotoLayer
          thumb={thumb}
          cheia={cheia}
          alt={alt}
          transicao={transicao}
          pronta={cheiaPronta}
          onThumbCaiu={() => setThumbCaiu(true)}
          onCheiaPronta={() => setCheiaPronta(true)}
          onCheiaCaiu={() => setCheiaCaiu(true)}
        />
      )}

      {(isVideo ? !cheia : !fundo) && <div className={CLASSE_PLACEHOLDER} />}
    </div>
  );
}

function VideoLayer({
  videoRef,
  src,
  alt,
  transicao,
  pronta,
  onPronta,
  onCaiu,
  onFim,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  src: string | undefined;
  alt: string;
  transicao: string | undefined;
  pronta: boolean;
  onPronta: () => void;
  onCaiu: () => void;
  onFim?: () => void;
}) {
  if (!src) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      playsInline
      muted
      preload="auto"
      aria-label={alt}
      onLoadedData={onPronta}
      onError={onCaiu}
      onEnded={() => onFim?.()}
      className={cn(CLASSE_INTEIRA, transicao, pronta ? "opacity-100" : "opacity-0")}
    />
  );
}

function PhotoLayer({
  thumb,
  cheia,
  alt,
  transicao,
  pronta,
  onThumbCaiu,
  onCheiaPronta,
  onCheiaCaiu,
}: {
  thumb: string | undefined;
  cheia: string | undefined;
  alt: string;
  transicao: string | undefined;
  pronta: boolean;
  onThumbCaiu: () => void;
  onCheiaPronta: () => void;
  onCheiaCaiu: () => void;
}) {
  return (
    <>
      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          onError={onThumbCaiu}
          className={cn(CLASSE_INTEIRA, transicao, pronta ? "opacity-0" : "opacity-100")}
        />
      )}

      {cheia && (
        <img
          src={cheia}
          alt={alt}
          decoding="async"
          onLoad={onCheiaPronta}
          onError={onCheiaCaiu}
          className={cn(
            CLASSE_INTEIRA,
            transicao,
            pronta || !thumb ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </>
  );
}
