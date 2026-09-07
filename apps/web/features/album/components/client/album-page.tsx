"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CameraIcon, GuestHeader, GuestShell, GuestMain, SkipLink, cn } from "@albora/ui-web";
import { photoPathForMission } from "@/features/missions/lib/missions-utils";
import { albumPath } from "../../lib/album-path";
import { useAlbum } from "../../hooks/use-album";
import { useAlbumFilter } from "../../hooks/use-album-filter";
import type { AlbumMission } from "../../hooks/use-album-filter";

export type { AlbumMission };
import { useAlbumViewer } from "../../hooks/use-album-viewer";
import { chaptersFromAlbum, firstCoverUrl, flattenChapterPhotos } from "../../lib/bands";
import { AlbumTimeline, AlbumTimelineLoading } from "./album-timeline";
import {
  CoverHero,
  AlbumCounters,
  ChapterTimeRange,
  AlbumFilters,
  AlbumFooter,
} from "../ui";
import { AlbumLightbox } from "../ui/album-lightbox";

export function AlbumPage({
  slug,
  missions,
  initialMission = null,
  cameraPath,
}: {
  slug: string;
  missions: AlbumMission[];
  initialMission?: string | null;
  cameraPath: string;
}) {
  const router = useRouter();
  const { missionId, setFiltro } = useAlbumFilter(missions, initialMission);
  const { estado, recarregar } = useAlbum();

  function selecionar(id: string | null) {
    setFiltro(id);
    router.replace(albumPath(slug, id), { scroll: false });
  }

  const capitulos = useMemo(
    () => (estado.album ? chaptersFromAlbum(estado.album, missionId) : []),
    [estado.album, missionId],
  );
  const fotos = useMemo(() => flattenChapterPhotos(capitulos), [capitulos]);
  const capa = estado.album ? firstCoverUrl(estado.album) : null;

  const { aberta, abrir, fechar, anterior, proxima } = useAlbumViewer(fotos);

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && capitulos.length === 0 && estado.falha === null;

  return (
    <>
      <SkipLink />

      <GuestShell>
        <style>{`
          @keyframes album-respirar {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          @keyframes album-capa-surge {
            from { opacity: 0; transform: scale(1.03); }
            to   { opacity: 1; transform: scale(1); }
          }
          .album-esperando { animation: album-respirar 1900ms var(--curva) infinite; }
          .album-capa-entra { animation: album-capa-surge var(--tempo-lento) var(--curva) both; }
          @media (prefers-reduced-motion: reduce) {
            .album-esperando, .album-capa-entra { animation: none !important; }
          }
        `}</style>

        {capa && <CoverHero src={capa} />}

        <GuestMain>
          <GuestHeader
            title="O álbum"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
          />

          {estado.album && <AlbumCounters contadores={estado.album.contadores} />}

          {missions.length > 0 && (
            <AlbumFilters missions={missions} selected={missionId} onSelect={selecionar} />
          )}

          {primeiraCarga && <AlbumTimelineLoading />}

          {vazio && (
            <div className="flex flex-col items-center py-[calc(var(--espaco)*8)] text-center">
              <div
                aria-hidden
                className="mb-4 grid size-14 place-items-center rounded-full bg-superficie-alta text-ink-3"
              >
                <CameraIcon size={24} />
              </div>
              <p className="tipo-subtitle tipo-balance mb-2 text-ink">
                {missionId ? "Ninguém fez essa ainda." : "Ainda não há fotos no álbum."}
              </p>
              <p className="tipo-body mb-6 max-w-[24rem] text-ink-2">
                {missionId
                  ? "Sua foto pode ser a primeira."
                  : "Seja o primeiro a fotografar esta noite."}
              </p>
              <a
                href={missionId ? photoPathForMission(slug, missionId) : cameraPath}
                className="grid min-h-[3.375rem] w-full place-items-center rounded-pilula bg-acento px-[1.125rem] font-medium text-sobre-acento no-underline shadow-suave transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                Tirar foto
              </a>
            </div>
          )}

          {capitulos.length > 0 &&
            capitulos.map((capitulo) => (
              <section
                key={capitulo.id}
                aria-label={capitulo.titulo}
                className={cn(capitulo.nomear && "mt-9 first:mt-0")}
              >
                {capitulo.nomear && (
                  <div className="mb-4 border-b border-linha pb-3">
                    <h2
                      className={cn(
                        "tipo-subtitle tipo-balance m-0 text-ink",
                        capitulo.faixas.some((f) => f.amanhecer) && "text-acento",
                      )}
                    >
                      {capitulo.titulo}
                    </h2>
                    <ChapterTimeRange faixas={capitulo.faixas} />
                  </div>
                )}
                <AlbumTimeline faixas={capitulo.faixas} onAbrir={abrir} />
              </section>
            ))}

          <AlbumFooter falha={estado.falha} onTentar={recarregar} />
        </GuestMain>
      </GuestShell>

      {aberta && (
        <AlbumLightbox
          foto={aberta}
          interacao={estado.album?.interacao ?? "espelho"}
          onSair={fechar}
          onAnterior={anterior}
          onProxima={proxima}
        />
      )}
    </>
  );
}
