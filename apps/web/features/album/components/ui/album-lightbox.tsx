"use client";

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto do álbum"
      className="fixed inset-0 z-40 overflow-hidden bg-bg"
      onClick={() => {
        if (!pedidoAberto) onSair();
      }}
    >
      <style>{`
        @keyframes album-lb-surge {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        .album-lb-entra { animation: album-lb-surge var(--tempo-rapido) var(--mola) both; }
        @media (prefers-reduced-motion: reduce) {
          .album-lb-entra { animation: none !important; }
        }
      `}</style>

      {/* Fundo ambiente: a mesma foto, borrada — a moldura preenche a tela sem cortar a foto principal (modelo Ambiente, docs/flows.md §5.0). */}
      {src && (
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-[1.15] object-cover blur-3xl saturate-[0.7] brightness-[0.4]"
        />
      )}

      <LightboxTopBar onRequestPhoto={() => setPedidoAberto(true)} onClose={onSair} />

      {src ? (
        <img
          key={foto.id}
          src={src}
          alt=""
          className="album-lb-entra absolute inset-0 size-full object-contain object-top"
          onClick={(ev) => ev.stopPropagation()}
        />
      ) : null}

      <LightboxNavButtons onPrevious={onAnterior} onNext={onProxima} />

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-center bg-veu-feed-base pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10"
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
