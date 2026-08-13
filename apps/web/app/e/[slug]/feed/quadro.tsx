"use client";

import { useEffect, useRef, useState } from "react";

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
export function Quadro({
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

  const inteira: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
  };

  const transicao = movimentoReduzido ? undefined : "opacity var(--tempo-rapido) var(--curva)";

  if (ehVideo) {
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
        {fundo && (
          <img
            src={fundo}
            alt=""
            aria-hidden
            onError={() => setThumbCaiu(true)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scale(1.18)",
              filter: "blur(44px) saturate(0.7) brightness(0.42)",
            }}
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
            style={{ ...inteira, opacity: cheiaPronta ? 1 : 0, transition: transicao }}
          />
        )}

        {!cheia && (
          <div
            style={{
              position: "absolute",
              inset: "12% 8%",
              border: "1px solid var(--linha)",
              borderRadius: "var(--raio)",
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      {fundo && (
        <img
          src={fundo}
          alt=""
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scale(1.18)",
            filter: "blur(44px) saturate(0.7) brightness(0.42)",
          }}
        />
      )}

      {thumb && (
        <img
          src={thumb}
          alt=""
          aria-hidden
          onError={() => setThumbCaiu(true)}
          style={{ ...inteira, opacity: cheiaPronta ? 0 : 1, transition: transicao }}
        />
      )}

      {cheia && (
        <img
          src={cheia}
          alt={alt}
          decoding="async"
          onLoad={() => setCheiaPronta(true)}
          onError={() => setCheiaCaiu(true)}
          style={{ ...inteira, opacity: cheiaPronta || !thumb ? 1 : 0, transition: transicao }}
        />
      )}

      {!fundo && (
        <div
          style={{
            position: "absolute",
            inset: "12% 8%",
            border: "1px solid var(--linha)",
            borderRadius: "var(--raio)",
          }}
        />
      )}
    </div>
  );
}
