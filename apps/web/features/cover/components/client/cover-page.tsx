"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { GuestTabBar } from "@/features/guest/components/client/guest-tab-bar";
import { HostMessageCard } from "@/features/guest/components/client/host-message-card";
import {
  Badge,
  Frame,
  GridIcon,
  GuestShell,
  PrimaryButton,
  StackIcon,
  Star,
} from "@albora/ui-web";
import type { AlbumServido } from "@/lib/album";
import type { CoverMoment } from "../../types/cover";

function IconeMusica({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function truncateLabel(label: string, max = 16): string {
  return label.length <= max ? label : `${label.slice(0, max - 1)}…`;
}

function albumCoverUrl(album: AlbumServido): string | null {
  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const foto = pagina.fotos[0];
      if (foto?.url) return foto.url;
    }
  }
  return null;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date(iso));
}

function Shortcut({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 text-ink-2 no-underline"
    >
      {icon}
      <span className="text-[0.625rem] uppercase tracking-rotulo">{label}</span>
      <span className="text-[0.6875rem] text-ink">{value}</span>
    </Link>
  );
}

export function CoverPage({
  slug,
  eventName,
  startsAt,
  album,
  moments,
  interactionOpen,
  musicLabel,
  hostMessageLabel,
}: {
  slug: string;
  eventName: string;
  startsAt: string;
  album: AlbumServido;
  moments: CoverMoment[];
  interactionOpen: boolean;
  musicLabel: string | null;
  hostMessageLabel: string;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const hero = albumCoverUrl(album);
  const guests = album.contadores.convidados;
  const photos = album.contadores.fotos;
  const missions = album.contadores.missoes;
  const centerIndex = moments.length > 1 ? 1 : 0;

  return (
    <>
      <GuestShell>
        <div className="relative h-[20.5rem] shrink-0">
          {hero ? (
            <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <Frame label="" atmosphere variant={1} />
          )}

          <div className="absolute inset-0 bg-gradient-cover-hero" />
        </div>

        <div className="relative -mt-13 px-6 text-center">
          <p className="m-0 font-titulo text-[1.875rem] font-light leading-tight tracking-titulo">
            {eventName}
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-2">
            {formatDate(startsAt)}
            {guests > 0
              ? ` · ${guests} ${guests === 1 ? "pessoa" : "pessoas"} fotografando`
              : ""}
          </p>
        </div>

        <HostMessageCard label={hostMessageLabel} hostName={eventName} />

        <div className="grid grid-cols-4 gap-2 px-[1.125rem] pt-5 pb-[1.125rem]">
          <Shortcut
            href={`${base}/album`}
            label="Álbum"
            value={String(photos)}
            icon={<GridIcon size={20} />}
          />
          <Shortcut
            href={`${base}/feed`}
            label="Feed"
            value={interactionOpen ? "ao vivo" : "em breve"}
            icon={<StackIcon size={20} />}
          />
          <Shortcut
            href={`${base}/missions`}
            label="Missões"
            value={missions > 0 ? String(missions) : "—"}
            icon={<Star size={20} />}
          />
          <Shortcut
            href={`${base}/music`}
            label="Música"
            value={musicLabel ? truncateLabel(musicLabel) : "trilha"}
            icon={<IconeMusica />}
          />
        </div>

        <p className="m-0 px-[1.125rem] pb-2 text-center text-[0.75rem] text-ink-3">
          <Link href="/wall-pair" className="text-ink-2 underline">
            Ligar telão
          </Link>
          {" · digite o código que aparece na TV"}
        </p>

        {moments.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
              <span className="font-titulo text-base">Os momentos</span>
              <Link href={`${base}/album`} className="text-[0.6875rem] text-ink-3 no-underline">
                ver álbum
              </Link>
            </div>

            <div className="flex gap-2.5 overflow-x-auto px-[1.125rem] [scrollbar-width:none]">
              {moments.map((moment, i) => {
                const central = i === centerIndex;
                const hrefAlbum = moment.missionFilterId
                  ? `${base}/album?missao=${encodeURIComponent(moment.missionFilterId)}`
                  : `${base}/album`;

                return (
                  <Link
                    key={moment.id}
                    href={hrefAlbum}
                    className={`relative aspect-[9/16] shrink-0 overflow-hidden rounded-token text-inherit no-underline ${
                      central ? "w-[9.25rem]" : "w-20 opacity-60"
                    }`}
                  >
                    {moment.thumbUrl ? (
                      <img
                        src={moment.thumbUrl}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <Frame label="" atmosphere variant={i * 6 + 2} />
                    )}

                    <span className="absolute inset-0 bg-gradient-moment-scrim" />

                    {central && interactionOpen ? (
                      <span className="absolute left-2 top-2">
                        <Badge tone="accent">
                          <span className="pulso size-1 rounded-full bg-current" />
                          agora
                        </Badge>
                      </span>
                    ) : null}

                    <span
                      className={`absolute inset-x-2.5 bottom-2.5 block font-titulo leading-tight tracking-titulo ${
                        central ? "text-[0.9375rem]" : "text-[0.6875rem]"
                      }`}
                    >
                      {moment.title}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-6 pt-[1.125rem] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
          <PrimaryButton onClick={() => router.push(`${base}/photo`)}>Enviar foto</PrimaryButton>
        </div>
      </GuestShell>
      <GuestTabBar slug={slug} />
    </>
  );
}
