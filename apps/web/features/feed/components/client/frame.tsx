"use client";

import { cn } from "@albora/ui-web";
import { useEffect, useRef, useState } from "react";

const CLASSE_INTEIRA =
  "absolute inset-0 size-full object-contain";
const CLASSE_FUNDO_DESFOCADO =
  "absolute inset-0 size-full scale-[1.18] object-cover blur-[44px] saturate-[0.7] brightness-[0.42]";
const CLASSE_PLACEHOLDER =
  "absolute inset-x-[8%] inset-y-[12%] rounded-token border border-linha";
const CLASSE_TRANSICAO = "[transition:opacity_var(--tempo-rapido)_var(--curva)]";

/**
 * A mídia dentro do quadro 9:16, **sem cortar**.
 *
 * Três de cada quatro fotos de festa são verticais, e a tela do celular é
 * vertical: essas preenchem quase tudo sozinhas. O problema é a minoria
 * horizontal — encaixá-la à força num quadro vertical descartaria as laterais,
 * e é lá que está metade da mesa.
 *
 * A saída é o modelo **Ambiente** do `docs/flows.md` §5.0: a imagem inteira,
 * `contain`, com a própria foto desfocada estendendo o fundo. Nada é
 * descartado, e o quadro não fica com duas tarjas mortas em cima e embaixo.
 *
 * Vídeo usa o mesmo enquadramento: `contain`, fundo desfocado da miniatura
 * quando existe, e o arquivo cheio toca mudo — o reprodutor avança no `ended`.
 */
export function Frame({
  urlThumb,
  urlCheia,
  alt,
  movimentoReduzido,
  ehVideo = false,
  onFim,
}: {
  urlThumb: string | undefined;
  urlCheia: string | undefined;
  alt: string;
  movimentoReduzido: boolean;
  ehVideo?: boolean;
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
  }, [urlCheia, ehVideo]);

  useEffect(() => {
    if (!ehVideo || !urlCheia || movimentoReduzido) return;
    const el = videoRef.current;
    if (!el) return;
    void el.play().catch(() => {
      /* autoplay bloqueado: o convidado ainda pode tocar na tela */
    });
  }, [ehVideo, urlCheia, movimentoReduzido]);

  const thumb = thumbCaiu ? undefined : urlThumb;
  const cheia = cheiaCaiu ? undefined : urlCheia;
  const fundo = thumb ?? (ehVideo ? undefined : cheia);

  const transicao = movimentoReduzido ? undefined : CLASSE_TRANSICAO;

  if (ehVideo) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-bg">
        {fundo && (
          <img
            src={fundo}
            alt=""
            aria-hidden
            onError={() => setThumbCaiu(true)}
            className={CLASSE_FUNDO_DESFOCADO}
          />
        )}

        {cheia && (
          <video
            ref={videoRef}
            src={cheia}
            playsInline
            muted
            preload="auto"
            aria-label={alt}
            onLoadedData={() => setCheiaPronta(true)}
            onError={() => setCheiaCaiu(true)}
            onEnded={() => onFim?.()}
            className={cn(CLASSE_INTEIRA, transicao, cheiaPronta ? "opacity-100" : "opacity-0")}
          />
        )}

        {!cheia && <div className={CLASSE_PLACEHOLDER} />}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      {fundo && (
        <img src={fundo} alt="" aria-hidden className={CLASSE_FUNDO_DESFOCADO} />
      )}

      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          onError={() => setThumbCaiu(true)}
          className={cn(CLASSE_INTEIRA, transicao, cheiaPronta ? "opacity-0" : "opacity-100")}
        />
      )}

      {cheia && (
        <img
          src={cheia}
          alt={alt}
          decoding="async"
          onLoad={() => setCheiaPronta(true)}
          onError={() => setCheiaCaiu(true)}
          className={cn(
            CLASSE_INTEIRA,
            transicao,
            cheiaPronta || !thumb ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {!fundo && <div className={CLASSE_PLACEHOLDER} />}
    </div>
  );
}
