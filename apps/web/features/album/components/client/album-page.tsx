"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ModoInteracao } from "@albora/core";
import {
  Badge,
  FloatingNav,
  GuestHeader,
  GuestShell,
  EmptyState,
  GuestMain,
  SecondaryButton,
  cn,
} from "@albora/ui-web";
import type { ServedPhoto } from "@/lib/album";
import { ReportSheet } from "@/features/feed/components/client/report-sheet";
import { PhotoInteraction } from "@/features/feed/components/client/photo-interaction";
import { useAlbum } from "../../hooks/use-album";
import { chaptersFromAlbum, firstCoverUrl, flattenChapterPhotos } from "../../lib/bands";
import type { AlbumBand } from "../../lib/bands";
import { AlbumTimeline, AlbumTimelineLoading } from "./album-timeline";

export type AlbumMission = { id: string; title: string };

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
  const [missionId, setMissionId] = useState<string | null>(() => {
    if (initialMission && missions.some((m) => m.id === initialMission)) return initialMission;
    return null;
  });
  const { estado, recarregar } = useAlbum();
  const [aberta, setAberta] = useState<ServedPhoto | null>(null);

  const capitulos = useMemo(
    () => (estado.album ? chaptersFromAlbum(estado.album, missionId) : []),
    [estado.album, missionId],
  );
  const fotos = useMemo(() => flattenChapterPhotos(capitulos), [capitulos]);
  const capa = estado.album ? firstCoverUrl(estado.album) : null;

  const primeiraCarga = !estado.jaCarregou && estado.carregando;
  const vazio = estado.jaCarregou && capitulos.length === 0 && estado.falha === null;

  useEffect(() => {
    if (aberta && !fotos.some((f) => f.id === aberta.id)) setAberta(null);
  }, [aberta, fotos]);

  useEffect(() => {
    if (!aberta) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [aberta]);

  const ir = useCallback(
    (delta: number) => {
      if (!aberta) return;
      const i = fotos.findIndex((f) => f.id === aberta.id);
      const proxima = fotos[i + delta];
      if (proxima) setAberta(proxima);
    },
    [aberta, fotos],
  );

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

          {estado.album && <Counters contadores={estado.album.contadores} />}

          {missions.length > 0 && (
            <Filters missions={missions} selected={missionId} onSelect={setMissionId} />
          )}

          {primeiraCarga && <AlbumTimelineLoading />}

          {vazio && (
            <EmptyState
              title={missionId ? "Ninguém fez essa ainda." : "Ainda não há fotos no álbum."}
              lede={missionId ? "Sua foto pode ser a primeira." : "Seja o primeiro a fotografar esta noite."}
              cameraPath={cameraPath}
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
                <AlbumTimeline faixas={capitulo.faixas} onAbrir={setAberta} />
              </section>
            ))}

          <Rodape falha={estado.falha} onTentar={recarregar} />
        </GuestMain>
      </GuestShell>

      {aberta && (
        <Lightbox
          foto={aberta}
          interacao={estado.album?.interacao ?? "espelho"}
          onSair={() => setAberta(null)}
          onAnterior={() => ir(-1)}
          onProxima={() => ir(1)}
        />
      )}

      <FloatingNav active="album" base={`/e/${encodeURIComponent(slug)}`} linkComponent={Link} />
    </>
  );
}

function ChapterTimeRange({ faixas }: { faixas: AlbumBand[] }) {
  const horas = faixas.map((f) => f.hora).filter((h): h is number => h !== null);
  if (horas.length === 0) return null;
  const primeira = Math.min(...horas);
  const ultima = Math.max(...horas);
  const label = primeira === ultima ? `${primeira}h` : `${primeira}h – ${ultima}h`;
  return <p className="m-0 mt-0.5 text-[0.8125rem] text-ink-3">{label}</p>;
}

function CoverHero({ src }: { src: string }) {
  return (
    <div className="relative h-52 shrink-0 overflow-hidden">
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full scale-[1.2] object-cover blur-md saturate-[0.7] brightness-[0.45]"
      />
      <img src={src} alt="" className="absolute inset-0 size-full object-contain" />
      <div className="absolute inset-0 bg-gradient-cover-hero" />
    </div>
  );
}

function Counters({
  contadores,
}: {
  contadores: { fotos: number; convidados: number; missoes: number };
}) {
  return (
    <ul
      className="mb-4 mt-0 flex list-none justify-center gap-0 p-0"
      aria-label="A noite em números"
    >
      <Stat valor={contadores.fotos} rotulo={contadores.fotos === 1 ? "foto" : "fotos"} />
      <Stat
        valor={contadores.convidados}
        rotulo={contadores.convidados === 1 ? "pessoa" : "pessoas"}
      />
      <Stat
        valor={contadores.missoes}
        rotulo={contadores.missoes === 1 ? "missão" : "missões"}
      />
    </ul>
  );
}

function Stat({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <li className="flex-1 border-l border-linha px-2 text-center first:border-l-0">
      <span className="block font-titulo text-[1.375rem] font-light tabular-nums leading-none">
        {valor}
      </span>
      <span className="mt-1 block text-[0.5625rem] uppercase tracking-rotulo text-ink-3">
        {rotulo}
      </span>
    </li>
  );
}

function Filters({
  missions,
  selected,
  onSelect,
}: {
  missions: AlbumMission[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrar o álbum"
      className="-mx-[calc(var(--espaco)*5)] mb-3.5 flex gap-[0.4375rem] overflow-x-auto px-[calc(var(--espaco)*5)] [scrollbar-width:none]"
    >
      <ButtonBadge active={selected === null} onClick={() => onSelect(null)}>
        Tudo
      </ButtonBadge>
      {missions.map((m) => (
        <ButtonBadge
          key={m.id}
          active={selected === m.id}
          onClick={() => onSelect(selected === m.id ? null : m.id)}
        >
          {m.title}
        </ButtonBadge>
      ))}
    </div>
  );
}

function ButtonBadge({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="shrink-0 cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
    >
      <Badge tone={active ? "accent" : "neutral"}>{children}</Badge>
    </button>
  );
}

function Rodape({
  falha,
  onTentar,
}: {
  falha: ReturnType<typeof useAlbum>["estado"]["falha"];
  onTentar: () => void;
}) {
  if (falha === "sessao") {
    return (
      <p className="mt-6 text-center text-[0.9rem] leading-relaxed text-ink-2">
        Sua entrada expirou.{" "}
        <a href="/scan" className="text-acento underline">Escaneie o QR da mesa</a>{" "}
        de novo para ver o álbum.
      </p>
    );
  }

  if (falha !== null) {
    return (
      <div className="mt-6 text-center">
        <p className="mb-3 mt-0 text-[0.9rem] leading-relaxed text-ink-2">
          Não consegui carregar o álbum agora.
        </p>
        <SecondaryButton onClick={onTentar}>Tentar de novo</SecondaryButton>
      </div>
    );
  }

  return null;
}

function Lightbox({
  foto,
  interacao,
  onSair,
  onAnterior,
  onProxima,
}: {
  foto: ServedPhoto;
  interacao: ModoInteracao;
  onSair: () => void;
  onAnterior: () => void;
  onProxima: () => void;
}) {
  const [pedidoAberto, setPedidoAberto] = useState(false);

  useEffect(() => {
    const tecla = (ev: KeyboardEvent) => {
      if (pedidoAberto) return;
      if (ev.key === "Escape") onSair();
      if (ev.key === "ArrowLeft") onAnterior();
      if (ev.key === "ArrowRight") onProxima();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [onSair, onAnterior, onProxima, pedidoAberto]);

  const src = foto.url || foto.urlThumb;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto do álbum"
      className="fixed inset-0 z-40 bg-bg"
      onClick={() => {
        if (!pedidoAberto) onSair();
      }}
    >
      <button
        type="button"
        aria-label="Pedir para tirar esta foto"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-pilula border border-linha bg-superficie px-4 py-2 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento hover:text-acento"
        onClick={(ev) => {
          ev.stopPropagation();
          setPedidoAberto(true);
        }}
      >
        Pedir para tirar
      </button>
      <button
        type="button"
        aria-label="Fechar"
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-pilula border border-linha bg-superficie px-4 py-2 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento hover:text-acento"
        onClick={(ev) => {
          ev.stopPropagation();
          onSair();
        }}
      >
        Fechar
      </button>
      {src ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 size-full object-contain"
          onClick={(ev) => ev.stopPropagation()}
        />
      ) : null}
      <button
        type="button"
        aria-label="Foto anterior"
        className="absolute top-16 bottom-0 left-0 w-1/3 cursor-pointer border-0 bg-transparent"
        onClick={(ev) => {
          ev.stopPropagation();
          onAnterior();
        }}
      />
      <button
        type="button"
        aria-label="Próxima foto"
        className="absolute top-16 bottom-0 right-0 w-1/3 cursor-pointer border-0 bg-transparent"
        onClick={(ev) => {
          ev.stopPropagation();
          onProxima();
        }}
      />
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
