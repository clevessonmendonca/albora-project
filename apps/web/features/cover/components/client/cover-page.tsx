"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HostMessageCard } from "@/features/guest/components/client/host-message-card";
import {
  FloatingNav,
  GuestShell,
  PrimaryButton,
  GridIcon,
  StackIcon,
  Star,
  SkipLink,
} from "@albora/ui-web";
import type { AlbumServido } from "@/lib/album";
import type { CoverMoment } from "../../types/cover";
import { useStatsPolling } from "../../hooks/use-stats-polling";
import { useInteractionGate } from "../../hooks/use-interaction-gate";
import { usePhotoFlash } from "../../hooks/use-photo-flash";
import { albumCoverUrl, truncateLabel } from "../../lib/cover-utils";
import {
  InviteButton,
  MusicIcon,
  CoverShortcut,
  CoverHero,
  CoverEventInfo,
  MomentsSection,
} from "../ui";

export function CoverPage({
  slug,
  eventName,
  startsAt,
  album,
  moments,
  interactionOpen: interactionOpenInitial,
  interactionBannerLabel: interactionBannerInitial,
  interactionOpensAt,
  interactionLabels,
  fuso,
  musicLabel,
  hostMessageLabel,
  confessionalTitle = null,
  coverImageUrl = null,
}: {
  slug: string;
  eventName: string;
  startsAt: string;
  album: AlbumServido;
  moments: CoverMoment[];
  interactionOpen: boolean;
  interactionBannerLabel: string;
  interactionOpensAt: string | null;
  interactionLabels: {
    aberta: string;
    fechada: string;
    fechadaAgendada: string;
  };
  fuso: string;
  musicLabel: string | null;
  hostMessageLabel: string;
  confessionalTitle?: string | null;
  coverImageUrl?: string | null;
}) {
  const router = useRouter();
  const base = `/e/${encodeURIComponent(slug)}`;
  const hero = coverImageUrl ?? albumCoverUrl(album);
  const guests = album.contadores.convidados;
  const missions = album.contadores.missoes;

  const photos = useStatsPolling(slug, album.contadores.fotos);
  const photoFlash = usePhotoFlash(photos);
  const { open: interactionOpen, label: interactionBannerLabel } = useInteractionGate(
    slug,
    {
      open: interactionOpenInitial,
      label: interactionBannerInitial,
      opensAtIso: interactionOpensAt,
      fuso,
    },
    interactionLabels,
  );

  return (
    <>
      <SkipLink />
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

        <CoverHero hero={hero} />

        <main id="main-content" className="flex min-h-0 flex-1 flex-col">
        <CoverEventInfo eventName={eventName} startsAt={startsAt} guests={guests} />

        <p
          className="mx-[1.125rem] mt-3 mb-0 rounded-superficie bg-superficie px-3.5 py-2.5 text-center text-[0.8125rem] leading-[1.55] text-ink-2"
          role="status"
        >
          {interactionBannerLabel}
        </p>

        <HostMessageCard label={hostMessageLabel} hostName={eventName} />

        <div className="grid grid-cols-4 gap-2 px-[1.125rem] pt-5 pb-[1.125rem]">
          <CoverShortcut
            href={`${base}/album`}
            label="Álbum"
            value={photos > 0 ? String(photos) : "em breve"}
            icon={<GridIcon size={20} />}
            primary
            valueClass={photoFlash ? "cover-foto-flash" : ""}
          />
          <CoverShortcut
            href={`${base}/feed`}
            label="Feed"
            value={interactionOpen ? "ao vivo" : "em breve"}
            icon={<StackIcon size={20} />}
            primary
          />
          <CoverShortcut
            href={`${base}/missions`}
            label="Missões"
            value={missions > 0 ? String(missions) : "—"}
            icon={<Star size={20} />}
          />
          <CoverShortcut
            href={`${base}/music`}
            label="Música"
            value={musicLabel ? truncateLabel(musicLabel) : "trilha"}
            icon={<MusicIcon />}
          />
        </div>

        <p className="m-0 px-[1.125rem] pb-2 text-center text-[0.75rem] text-ink-3">
          {confessionalTitle && (
            <>
              <Link
                href={`${base}/confessional`}
                className="text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
              >
                {confessionalTitle}
              </Link>
              {" · "}
            </>
          )}
          <Link
            href="/wall-pair"
            className="text-ink-2 underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
          >
            Ligar telão
          </Link>
        </p>

        <MomentsSection moments={moments} base={base} interactionOpen={interactionOpen} />

        <div className="grid gap-2.5 px-6 pt-[1.125rem] pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
          <PrimaryButton onClick={() => router.push(`${base}/photo`)}>
            Enviar foto
          </PrimaryButton>
          <InviteButton slug={slug} eventName={eventName} />
        </div>
        </main>
      </GuestShell>
      <FloatingNav base={base} linkComponent={Link} />
    </>
  );
}
