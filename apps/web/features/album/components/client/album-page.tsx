"use client";

import { useMemo } from "react";
import { GuestHeader, GuestShell, EmptyState, GuestMain, cn } from "@albora/ui-web";
import { photoPathForMission } from "@/features/missions/lib/missions-utils";
import { useAlbum } from "../../hooks/use-album";
import { useAlbumFilter } from "../../hooks/use-album-filter";
import type { AlbumMission } from "../../hooks/use-album-filter";
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
  const { missionId, setFiltro } = useAlbumFilter(missions, initialMission);
  const { estado, recarregar } = useAlbum();

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
      <GuestShell>
        <style>{`
          @keyframes album-respirar {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.55; }
          }
          .album-esperando { animation: album-respirar 1900ms var(--curva) infinite; }
          @media (prefers-reduced-motion: reduce) {
            .album-esperando { animation: none !important; }
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
            <AlbumFilters missions={missions} selected={missionId} onSelect={setFiltro} />
          )}

          {primeiraCarga && <AlbumTimelineLoading />}

          {vazio && (
            <EmptyState
              title={missionId ? "Ninguém fez essa ainda." : "Ainda não há fotos no álbum."}
              lede={
                missionId
                  ? "Sua foto pode ser a primeira."
                  : "Seja o primeiro a fotografar esta noite."
              }
              cameraPath={missionId ? photoPathForMission(slug, missionId) : cameraPath}
            />
          )}

          {capitulos.length > 0 &&
            capitulos.map((capitulo) => (
              <section
                key={capitulo.id}
                aria-label={capitulo.titulo}
                className={cn(capitulo.nomear && "mt-8 first:mt-0")}
              >
                {capitulo.nomear && (
                  <div className="mb-4">
                    <h2
                      className={cn(
                        "m-0 font-titulo text-[1.1875rem] font-light leading-[1.26] tracking-titulo",
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
