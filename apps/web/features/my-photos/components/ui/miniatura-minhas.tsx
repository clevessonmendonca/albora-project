"use client";

type MiniaturaMinhasProps = {
  isVideo: boolean;
  url?: string | undefined;
  urlVideo?: string | null | undefined;
  pendente: boolean;
};

/**
 * Miniatura de foto/vídeo na galeria pessoal.
 * Mostra preview com indicador de vídeo quando aplicável.
 */
export function MiniaturaMinhas({
  isVideo,
  url,
  urlVideo,
  pendente,
}: MiniaturaMinhasProps) {
  const cobertura = "block size-full object-cover";

  if (isVideo && pendente && url) {
    return (
      <video
        src={url}
        muted
        playsInline
        preload="metadata"
        className={cobertura}
      />
    );
  }

  if (isVideo && url) {
    return (
      <>
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cobertura}
        />
        <IndicadorVideo />
      </>
    );
  }

  if (isVideo && urlVideo) {
    return (
      <video
        src={urlVideo}
        muted
        playsInline
        preload="metadata"
        className={cobertura}
      />
    );
  }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className={cobertura}
      />
    );
  }

  return <div className="size-full bg-linha" />;
}

/**
 * Indicador visual de vídeo.
 */
function IndicadorVideo() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center bg-gradient-video-scrim-forte"
    >
      <span className="grid size-8 place-items-center rounded-full border border-linha bg-bg-vidro text-xs">
        ▶
      </span>
    </span>
  );
}
