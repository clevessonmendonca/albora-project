"use client";

import { isVideoMime } from "@albora/core";
import { useState } from "react";
import type { ModoInteracao } from "@albora/core";
import type { ServedPhoto } from "@/lib/album";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { ReportSheet } from "@/features/feed/components/client/report-sheet";
import { useLightboxKeyboard } from "../../hooks/use-lightbox-keyboard";
import { LightboxTopBar } from "./lightbox-top-bar";
import { LightboxNavButtons } from "./lightbox-nav-buttons";

type AlbumLightboxProps = {
  foto: ServedPhoto;
  interacao: ModoInteracao;
  onSair: () => void;
  onAnterior: () => void;
  onProxima: () => void;
};

export function AlbumLightbox({
  foto,
  interacao,
  onSair,
  onAnterior,
  onProxima,
}: AlbumLightboxProps) {
  const [pedidoAberto, setPedidoAberto] = useState(false);

  useLightboxKeyboard({
    onEscape: onSair,
    onArrowLeft: onAnterior,
    onArrowRight: onProxima,
    disabled: pedidoAberto,
  });

  const src = foto.url || foto.urlThumb;
  // O álbum não filtra por tipo (`album-db`: só `state = 'published'`), então
  // vídeo publicado chega aqui. Um `<img src="…mp4">` não toca nada — a pessoa
  // abre e encara o vazio. Mesma ramificação que o feed já faz.
  const ehVideo = isVideoMime(foto.mime);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ehVideo ? "Vídeo do álbum" : "Foto do álbum"}
      className="fixed inset-0 z-40 bg-bg"
      onClick={() => {
        if (!pedidoAberto) onSair();
      }}
    >
      <LightboxTopBar onRequestPhoto={() => setPedidoAberto(true)} onClose={onSair} />

      {src ? (
        ehVideo ? (
          <video
            src={src}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-contain"
            onClick={(ev) => ev.stopPropagation()}
          />
        ) : (
          <img
            src={src}
            alt=""
            className="absolute inset-0 size-full object-contain"
            onClick={(ev) => ev.stopPropagation()}
          />
        )
      ) : null}

      <LightboxNavButtons onPrevious={onAnterior} onNext={onProxima} />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="pointer-events-auto px-6">
          <PhotoInteraction uploadId={foto.id} interacao={interacao} />
        </div>
      </div>

      <div onClick={(ev) => ev.stopPropagation()}>
        <ReportSheet
          open={pedidoAberto}
          onClose={() => setPedidoAberto(false)}
          uploadId={foto.id}
        />
      </div>
    </div>
  );
}
