"use client";

import { useEffect, useState } from "react";
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

type Musica = {
  provedor: string;
  rotulo: string;
  url: string;
  capaUrl?: string | null;
} | null;

export function MusicPage({ slug }: { slug: string }) {
  const [musica, setMusica] = useState<Musica>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/music", { credentials: "same-origin" });
        if (!r.ok) throw new Error("falhou");
        const corpo = (await r.json()) as { musica: Musica };
        setMusica(corpo.musica);
      } catch {
        setErro(true);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  return (
    <>
      <GuestShell>
        <GuestMain reserveTabBarSpace>
          <GuestHeader
            title="Música da festa"
            homeHref={`/e/${encodeURIComponent(slug)}/cover`}
            action={carregando ? <Badge>Carregando…</Badge> : undefined}
          />

          {carregando && <SecondaryText>Carregando…</SecondaryText>}

          {!carregando && musica && (
            <section className="grid gap-4 pt-2">
              <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-superficie">
                {musica.capaUrl ? (
                  <img
                    src={musica.capaUrl}
                    alt=""
                    className="block size-full object-cover saturate-[0.92]"
                  />
                ) : (
                  <Frame label="" atmosphere variant={3} />
                )}
              </div>

              <p className="m-0 text-balance text-center font-titulo text-xl leading-[1.3]">
                {musica.rotulo}
              </p>
              <p className="m-0 text-center text-xs uppercase tracking-rotulo text-ink-3">
                Escolha do casal
              </p>

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
                Abrir no {musica.provedor}
              </a>
            </section>
          )}

          {!carregando && !musica && (
            <SecondaryText>
              Os anfitriões ainda não escolheram a trilha. Quando escolherem, ela aparece aqui.
            </SecondaryText>
          )}

          {erro && <ErrorMessage>Não deu para carregar agora.</ErrorMessage>}
        </GuestMain>
      </GuestShell>
      <GuestTabBar slug={slug} />
    </>
  );
}

function WaveAnimation() {
  return (
    <div
      className="flex h-10 items-end justify-center gap-[3px] my-2 motion-reduce:[&_span]:animate-none"
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
