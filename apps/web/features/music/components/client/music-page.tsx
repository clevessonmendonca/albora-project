"use client";

import Link from "next/link";
import {
  Badge,
  Card,
  ErrorMessage,
  FloatingNav,
  Frame,
  GuestHeader,
  GuestMain,
  GuestShell,
  MusicNoteIcon,
  Skeleton,
  SkipLink,
} from "@albora/ui-web";
import { SuggestionForm } from "@/features/music/components/client/suggestion-form";
import { useMusic } from "@/features/music/hooks/use-music";
import { providerLabel } from "@/features/music/lib/suggestion-copy";
import type { VisibleTrack } from "@/features/music/types/visible-track";

export function MusicPage({ slug, escolhaLabel }: { slug: string; escolhaLabel: string }) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const { state, suggest } = useMusic();

  return (
    <>
      <SkipLink />

      <GuestShell>
        <GuestMain reserveTabBarSpace>
          <GuestHeader
            title="Música da festa"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={state.loading ? <Badge>Carregando…</Badge> : undefined}
          />

          {state.loading && <NowPlayingSkeleton />}

          {!state.loading && state.track && (
            <NowPlaying track={state.track} escolhaLabel={escolhaLabel} />
          )}

          {!state.loading && !state.track && !state.failure && <NoTrackYet />}

          {state.failure === "session" && (
            <ErrorMessage>
              Sua sessão desta festa expirou.{" "}
              <a href="/scan" className="underline">
                Volte pelo QR da mesa.
              </a>
            </ErrorMessage>
          )}
          {state.failure === "network" && <ErrorMessage>Não deu para carregar agora.</ErrorMessage>}

          {!state.loading && !state.failure && (
            <SuggestionForm state={state} onSuggest={suggest} />
          )}
        </GuestMain>
      </GuestShell>
      <FloatingNav base={base} linkComponent={Link} />
    </>
  );
}

function NowPlaying({ track, escolhaLabel }: { track: VisibleTrack; escolhaLabel: string }) {
  return (
    <Card elevation={2} className="mt-2 grid justify-items-center gap-4 text-center">
      <div className="relative aspect-square w-full max-w-56 overflow-hidden rounded-superficie">
        {track.capaUrl ? (
          <img
            src={track.capaUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="block size-full object-cover saturate-[0.92]"
          />
        ) : (
          <Frame label="" atmosphere variant={3} />
        )}
      </div>

      <div className="grid gap-1">
        <p className="m-0 tipo-title tipo-balance">{track.rotulo}</p>
        <p className="m-0 tipo-label text-ink-3">{escolhaLabel}</p>
      </div>

      <WaveAnimation />

      <a
        href={track.url}
        className="inline-flex min-h-11 items-center gap-2 rounded-pilula border border-linha px-5 text-[0.85rem] text-acento-texto no-underline transition-[opacity,border-color,transform] duration-instantaneo ease-mola hover:border-acento-texto hover:opacity-85 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Abrir no {providerLabel(track.provedor)}
      </a>
    </Card>
  );
}

function NoTrackYet() {
  return (
    <div className="mt-2 grid justify-items-center gap-3 py-14 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-superficie-alta text-ink-3">
        <MusicNoteIcon size={24} />
      </span>
      <p className="m-0 tipo-subtitle tipo-balance text-ink">A trilha ainda não foi escolhida</p>
      <p className="m-0 tipo-body max-w-[300px] text-ink-2">
        Quando os anfitriões escolherem a música da festa, ela aparece aqui.
      </p>
    </div>
  );
}

function NowPlayingSkeleton() {
  return (
    <div className="mt-2 grid justify-items-center gap-4">
      <Skeleton className="aspect-square w-full max-w-56" />
      <Skeleton variant="text" className="h-5 w-2/3" />
      <Skeleton variant="text" className="h-3 w-1/3" />
    </div>
  );
}

function WaveAnimation() {
  return (
    <div className="my-1 flex h-10 items-end justify-center gap-[3px]" aria-hidden>
      {Array.from({ length: 24 }, (_, i) => (
        <span
          key={i}
          className="h-[40%] w-[3px] animate-[mus-pulsar_1.4s_var(--curva)_infinite_alternate] rounded-pilula bg-acento motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.07}s` }}
        />
      ))}
    </div>
  );
}
