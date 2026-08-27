"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HostMessageCard } from "@/features/guest/components/client/host-message-card";
import {
  Badge,
  FloatingNav,
  Frame,
  GridIcon,
  GuestShell,
  PrimaryButton,
  StackIcon,
  Star,
} from "@albora/ui-web";
import type { AlbumServido } from "@/lib/album";
import type { CoverMoment } from "../../types/cover";

function BotaoConvidar({ slug, eventName }: { slug: string; eventName: string }) {
  const [copiado, setCopiado] = useState(false);

  async function convidar() {
    const url = `${window.location.origin}/e/${encodeURIComponent(slug)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: eventName, url });
        return;
      } catch {
        // usuário cancelou o share nativo — tenta cópia silenciosa
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão de clipboard — ignora
    }
  }

  return (
    <button
      type="button"
      onClick={() => void convidar()}
      className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-pilula border border-linha bg-transparent px-4 font-inherit text-[0.9375rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
    >
      {copiado ? "Link copiado!" : "Convidar amigos"}
    </button>
  );
}

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
  primary = false,
  valueClass,
}: {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  primary?: boolean;
  valueClass?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta ${
        primary ? "text-ink" : "text-ink-2 opacity-85"
      }`}
    >
      {icon}
      <span className="text-[0.625rem] uppercase tracking-rotulo">{label}</span>
      <span className={`text-[0.6875rem] ${primary ? "text-ink" : "text-ink-2"} ${valueClass ?? ""}`}>{value}</span>
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
  hasConfessional = false,
  coverImageUrl = null,
}: {
  slug: string;
  eventName: string;
  startsAt: string;
  album: AlbumServido;
  moments: CoverMoment[];
  interactionOpen: boolean;
  musicLabel: string | null;
  hostMessageLabel: string;
  hasConfessional?: boolean;
  coverImageUrl?: string | null;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const hero = coverImageUrl ?? albumCoverUrl(album);
  const [photos, setPhotos] = useState(album.contadores.fotos);
  const guests = album.contadores.convidados;
  const missions = album.contadores.missoes;
  const photoInitialized = useRef(false);
  const [photoFlash, setPhotoFlash] = useState(false);

  useEffect(() => {
    if (!photoInitialized.current) {
      photoInitialized.current = true;
      return;
    }
    setPhotoFlash(true);
    const t = setTimeout(() => setPhotoFlash(false), 700);
    return () => clearTimeout(t);
  }, [photos]);

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch(`/api/e/${encodeURIComponent(slug)}/stats`);
        if (r.ok) {
          const d = (await r.json()) as { fotos: number };
          setPhotos(d.fotos);
        }
      } catch {
        // degradar silenciosamente: o contador estático fica visível
      }
    };
    const id = setInterval(() => void poll(), 60_000);
    return () => clearInterval(id);
  }, [slug]);
  const centerIndex = moments.length > 1 ? 1 : 0;

  return (
    <>
      <GuestShell>
        <style>{`
          @keyframes cover-foto-flash {
            0%,100% { color: inherit }
            40% { color: var(--acento-texto) }
          }
          .cover-foto-flash { animation: cover-foto-flash 700ms var(--curva) both }
          @media (prefers-reduced-motion: reduce) {
            .cover-foto-flash { animation: none !important }
          }
        `}</style>
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
            primary
            valueClass={photoFlash ? "cover-foto-flash" : ""}
          />
          <Shortcut
            href={`${base}/feed`}
            label="Feed"
            value={interactionOpen ? "ao vivo" : "em breve"}
            icon={<StackIcon size={20} />}
            primary
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
          {hasConfessional && (
            <>
              <Link href={`${base}/confessional`} className="text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70">
                Confessionário
              </Link>
              {" · "}
            </>
          )}
          <Link href="/wall-pair" className="text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70">
            Ligar telão
          </Link>
        </p>

        {moments.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
              <span className="font-titulo text-base">Os momentos</span>
              <Link href={`${base}/album`} className="text-[0.6875rem] text-ink-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2">
                ver álbum
              </Link>
            </div>

            <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[1.125rem] [scrollbar-width:none]">
              {moments.map((moment, i) => {
                const central = i === centerIndex;
                const hrefAlbum = moment.missionFilterId
                  ? `${base}/album?missao=${encodeURIComponent(moment.missionFilterId)}`
                  : `${base}/album`;

                return (
                  <Link
                    key={moment.id}
                    href={hrefAlbum}
                    className={`relative aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-token text-inherit no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 ${
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

                    <span className="absolute inset-x-2.5 bottom-2.5 block">
                      <span
                        className={`block font-titulo leading-tight tracking-titulo ${
                          central ? "text-[0.9375rem]" : "text-[0.6875rem]"
                        }`}
                      >
                        {moment.title}
                      </span>
                      {central && moment.contributorsLabel ? (
                        <span className="mt-0.5 block truncate text-[0.625rem] leading-tight text-ink-2 opacity-85">
                          {moment.contributorsLabel}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-2.5 px-6 pt-[1.125rem] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
          <PrimaryButton onClick={() => router.push(`${base}/photo`)}>Enviar foto</PrimaryButton>
          <BotaoConvidar slug={slug} eventName={eventName} />
        </div>
      </GuestShell>
      <FloatingNav base={base} linkComponent={Link} />
    </>
  );
}
