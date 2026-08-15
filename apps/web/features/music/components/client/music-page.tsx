"use client";

import {
  Badge,
  ErrorMessage,
  Frame,
  GuestHeader,
  GuestMain,
  GuestShell,
  SecondaryText,
} from "@albora/ui-web";
import { GuestTabBar } from "@/features/guest/components/client/guest-tab-bar";
import { SuggestionForm } from "@/features/music/components/client/suggestion-form";
import { useMusic } from "@/features/music/hooks/use-music";
import { providerLabel } from "@/features/music/lib/suggestion-copy";
import type { VisibleTrack } from "@/features/music/types/visible-track";

export function MusicPage({ slug, escolhaLabel }: { slug: string; escolhaLabel: string }) {
  const { estado, sugerir } = useMusic();

  return (
    <>
      <GuestShell>
        <GuestMain reserveTabBarSpace>
          <GuestHeader
            title="Música da festa"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={estado.carregando ? <Badge>Carregando…</Badge> : undefined}
          />

          {estado.carregando && <SecondaryText>Carregando…</SecondaryText>}

          {!estado.carregando && estado.musica && (
            <CoupleTrack musica={estado.musica} escolhaLabel={escolhaLabel} />
          )}

          {!estado.carregando && !estado.musica && !estado.falha && (
            <SecondaryText>
              Os anfitriões ainda não escolheram a trilha. Quando escolherem, ela aparece aqui.
            </SecondaryText>
          )}

          {estado.falha === "sessao" && (
            <ErrorMessage>Sua sessão desta festa expirou. Volte pelo QR da mesa.</ErrorMessage>
          )}
          {estado.falha === "rede" && <ErrorMessage>Não deu para carregar agora.</ErrorMessage>}

          {!estado.carregando && !estado.falha && (
            <SuggestionForm estado={estado} onSugerir={sugerir} />
          )}
        </GuestMain>
      </GuestShell>
      <GuestTabBar slug={slug} />
    </>
  );
}

function CoupleTrack({ musica, escolhaLabel }: { musica: VisibleTrack; escolhaLabel: string }) {
  return (
    <section className="grid gap-4 pt-2">
      <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-superficie">
        {musica.capaUrl ? (
          <img src={musica.capaUrl} alt="" className="block size-full object-cover saturate-[0.92]" />
        ) : (
          <Frame label="" atmosphere variant={3} />
        )}
      </div>

      <p className="m-0 text-balance text-center font-titulo text-xl leading-[1.3]">{musica.rotulo}</p>
      <p className="m-0 text-center text-xs uppercase tracking-rotulo text-ink-3">{escolhaLabel}</p>

      <WaveAnimation />

      <div className="flex items-center justify-center gap-4">
        <a
          href={musica.url}
          className="grid size-[3.25rem] place-items-center rounded-full bg-acento text-base text-sobre-acento no-underline"
          aria-label="Abrir no app de música"
        >
          ▶
        </a>
        <span className="text-[0.85rem] tabular-nums text-ink-3">—:——</span>
      </div>

      <a href={musica.url} className="block text-center text-[0.9rem] text-acento no-underline">
        Abrir no {providerLabel(musica.provedor)}
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
