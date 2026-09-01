"use client";

import Link from "next/link";
import {
  Badge,
  EmptyState,
  ErrorMessage,
  FloatingNav,
  Frame,
  GuestHeader,
  GuestMain,
  GuestShell,
  SecondaryText,
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

          {state.loading && <SecondaryText>Carregando…</SecondaryText>}

          {!state.loading && state.track && (
            <CoupleTrack track={state.track} escolhaLabel={escolhaLabel} />
          )}

          {!state.loading && !state.track && !state.failure && (
            <EmptyState
              title="A trilha ainda não foi escolhida"
              lede="Quando os anfitriões escolherem a música da festa, ela aparece aqui."
            />
          )}

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

function CoupleTrack({ track, escolhaLabel }: { track: VisibleTrack; escolhaLabel: string }) {
  return (
    <section className="grid gap-4 pt-2">
      <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-superficie">
        {track.capaUrl ? (
          <img src={track.capaUrl} alt="" loading="lazy" decoding="async" className="block size-full object-cover saturate-[0.92]" />
        ) : (
          <Frame label="" atmosphere variant={3} />
        )}
      </div>

      <p className="m-0 text-balance text-center font-titulo text-xl leading-[1.3]">{track.rotulo}</p>
      <p className="m-0 text-center text-xs uppercase tracking-rotulo text-ink-3">{escolhaLabel}</p>

      <WaveAnimation />

      <div className="flex items-center justify-center gap-4">
        <a
          href={track.url}
          className="grid size-[3.25rem] place-items-center rounded-full bg-acento text-base text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80"
          aria-label="Abrir no app de música"
        >
          ▶
        </a>
        <span className="text-[0.85rem] tabular-nums text-ink-3">—:——</span>
      </div>

      <a href={track.url} className="block text-center text-[0.9rem] text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80">
        Abrir no {providerLabel(track.provedor)}
      </a>
    </section>
  );
}

function WaveAnimation() {
  return (
    <div
      className="my-2 flex h-10 items-end justify-center gap-[3px] motion-reduce:[&_span]:animate-none"
      aria-hidden
    >
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
