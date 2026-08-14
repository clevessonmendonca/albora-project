"use client";

import {
  ALBORA_BRAND,
  IDENTITY_MODELS,
  toVariables,
  resolveTokens,
} from "@albora/tokens";
import { cn } from "@albora/ui-web";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Accent,
  Frame,
  Heading,
  Label,
  radiusStyle,
  transition,
} from "./pieces";
import { Stationery } from "./showcases";

/**
 * The three v4 pieces that respond to gesture.
 *
 * All render on the server in the first state and only then hydrate — spec
 * 013 check 2 is "the page works without JS until the CTA", and a demo that
 * only exists after hydration would leave a hole in the middle of the page
 * on an old Android on 4G.
 */

const STEPS = [
  {
    title: "O QR na mesa",
    caption: "23:41",
    description:
      "A placa fica na mesa. O convidado aponta a câmera e cai direto na tela de fotografar — sem loja de aplicativos e sem senha no caminho.",
  },
  {
    title: "A missão, e a foto",
    caption: "23:47",
    description:
      "Um convite curto por vez. A foto sai do celular direto para o armazenamento, e a fila segura o envio até o sinal voltar.",
  },
  {
    title: "O álbum, ao vivo",
    caption: "00:12",
    description:
      "Segundos depois ela está no feed, e todo mundo acompanha pelo próprio celular. Ninguém precisa mandar nada para ninguém no dia seguinte.",
  },
] as const;

function Screen({ step, example, mission }: { step: number; example: string; mission: string }) {
  const dark = resolveTokens({ marca: ALBORA_BRAND, pack: { fundo: "escuro" } });

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-bg text-ink"
      style={{
        ...(toVariables(dark) as CSSProperties),
        ...radiusStyle("calc(var(--raio-superficie) - 0.5rem)"),
      }}
    >
      <div className="flex justify-between px-4 pb-1.5 pt-3.5 text-[0.625rem] uppercase tracking-rotulo text-ink-3">
        <span>{STEPS[step]?.caption}</span>
        <span className="font-titulo">{example}</span>
      </div>

      {step === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[1.125rem] p-5">
          <div className="aspect-square w-[70%] rounded-token bg-ink p-2.5">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(var(--bg) 0 25%, var(--ink) 0 50%)",
                backgroundSize: "1.0625rem 1.0625rem",
              }}
            />
          </div>
          <p className="m-0 text-center font-titulo text-base leading-[1.4] text-ink-2">
            Aponte a câmera para o QR da mesa
          </p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
          <p className="m-0 text-[0.625rem] uppercase tracking-rotulo text-acento">
            MISSÃO 03 DE 04
          </p>
          <div className="rounded-token bg-acento-overlay p-4">
            <p className="m-0 font-titulo text-[1.125rem] leading-[1.25]">{mission}</p>
          </div>
          <div className="relative min-h-12 flex-1">
            <Frame label="A pista" radius="var(--raio)" />
          </div>
          <div className="flex items-center justify-center gap-2.5 rounded-pilula bg-ink px-3.5 py-[0.8125rem] text-[0.84375rem] font-semibold text-bg">
            <span className="pulso size-[0.5625rem] rounded-full bg-acento" />
            Enviando
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="relative grid flex-1 grid-cols-2 grid-rows-[1fr_1fr] gap-[0.4375rem] p-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative">
              <Frame label="" radius="var(--raio)" />
            </div>
          ))}
          <div className="absolute inset-x-3.5 bottom-3.5 rounded-pilula bg-superficie-alta p-[0.6875rem] text-center text-xs">
            847 fotos no álbum
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Phone({
  step,
  width,
  example,
  mission,
}: {
  step: number;
  width: string;
  example: string;
  mission: string;
}) {
  return (
    <div
      className="relative aspect-[9/19] rounded-superficie bg-gradient-device p-2 shadow-alta"
      style={{
        width,
        ...transition("transform", "var(--tempo-lento)"),
      }}
    >
      <Screen step={step} example={example} mission={mission} />
    </div>
  );
}

/**
 * The v4 scroll demo: a 300vh track and a stuck card that advances three
 * steps as the page goes down.
 *
 * Off-screen the observer is disconnected. A `scroll` listener on the whole
 * page across six sections is per-frame work nobody sees.
 */
export function ScrollDemo({ example, mission }: { example: string; mission: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = track.current;
    if (!target) return;

    let pending = 0;
    const measure = () => {
      pending = 0;
      const box = target.getBoundingClientRect();
      const course = box.height - window.innerHeight;
      if (course <= 0) return;

      const p = Math.min(1, Math.max(0, -box.top / course));
      setProgress(p);
      setStep(Math.min(STEPS.length - 1, Math.floor(p * STEPS.length)));
    };

    const onScroll = () => {
      if (pending === 0) pending = requestAnimationFrame(measure);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.addEventListener("scroll", onScroll, { passive: true });
          measure();
        } else {
          window.removeEventListener("scroll", onScroll);
        }
      },
      { rootMargin: "100px" },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (pending !== 0) cancelAnimationFrame(pending);
    };
  }, []);

  const current = STEPS[step] ?? STEPS[0];

  return (
    <div ref={track} className="relative h-[300vh]">
      <div className="sticky top-[4.875rem] flex max-h-[calc(100vh-6rem)] flex-col gap-[clamp(0.625rem,1.6vw,1.25rem)] overflow-hidden rounded-superficie bg-gradient-chao-quente p-[clamp(1rem,2.4vw,1.875rem)_clamp(1rem,3vw,2.25rem)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Label>Role para viver a festa</Label>
            <Heading size="clamp(1.375rem, 3vw, 2.375rem)">{current.title}</Heading>
          </div>
          <span className="text-ink-2">{current.caption}</span>
        </div>

        <div className="h-[0.1875rem] overflow-hidden rounded-pilula bg-acento-overlay-suave">
          <div
            className="h-full rounded-pilula bg-acento"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>

        <div className="flex min-h-0 flex-wrap items-center justify-center gap-[clamp(1rem,3vw,2.5rem)]">
          <Phone step={step} width="min(15rem, 42vw)" example={example} mission={mission} />

          <div className="min-w-[min(17.5rem,100%)] max-w-[40rem] flex-1">
            <div className="rounded-[calc(var(--raio-superficie)-0.75rem)] bg-gradient-device p-[0.5625rem]">
              <div className="relative grid h-[clamp(9rem,20vw,16rem)] grid-cols-3 grid-rows-[1fr_1fr] gap-2 overflow-hidden rounded-token bg-ink p-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="relative"
                    style={{
                      opacity: progress * 6 > i ? 1 : 0,
                      transform: progress * 6 > i ? "scale(1)" : "scale(0.92)",
                      transition:
                        "opacity var(--tempo-lento) var(--curva), transform var(--tempo-lento) var(--curva)",
                    }}
                  >
                    <Frame label="" radius="var(--raio)" />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3.5 leading-[1.55] text-ink-2">{current.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The wall wearing each identity model.
 *
 * The whole frame is redrawn by the resolver — color, font, radius, density
 * and tracking at once. If it ever diverges from the real wall, someone
 * wrote the second resolver that ADR 0003 forbids.
 */
export function IdentityWall({ example }: { example: string }) {
  const [selected, setSelected] = useState(IDENTITY_MODELS[0]?.id ?? "");
  const model =
    IDENTITY_MODELS.find((m) => m.id === selected) ?? IDENTITY_MODELS[0];

  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    ...(model ? { evento: model.camada } : {}),
  });

  const printTokens = resolveTokens({
    marca: ALBORA_BRAND,
    ...(model ? { evento: { ...model.camada, fundo: "claro" } } : { pack: { fundo: "claro" } }),
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {IDENTITY_MODELS.map((m) => {
          const active = m.id === selected;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              aria-pressed={active}
              className={cn(
                "flex cursor-pointer items-center gap-[0.6875rem] rounded-pilula border px-5 py-3 font-corpo text-[0.90625rem] text-ink",
                active ? "border-acento bg-superficie-alta" : "border-linha bg-transparent",
              )}
              style={transition("all", "var(--tempo)")}
            >
              <span
                className="size-3.5 rounded-full"
                style={{ background: m.amostra }}
              />
              {m.nome}
            </button>
          );
        })}
      </div>

      <div
        className="flex flex-col gap-[clamp(1.125rem,2.5vw,2rem)]"
        style={toVariables(tokens) as CSSProperties}
      >
        <div className="relative rounded-superficie bg-gradient-device p-3 shadow-alta">
          <div
            className="relative h-[clamp(15.625rem,38vw,33.75rem)] overflow-hidden bg-bg"
            style={{
              ...radiusStyle("calc(var(--raio-superficie) - 0.75rem)"),
              ...transition("background", "var(--tempo-lento)"),
            }}
          >
            <div
              className="absolute inset-[var(--espaco)] grid grid-cols-[2fr_1fr] grid-rows-2 gap-[var(--espaco)]"
              style={transition("all", "var(--tempo-lento)")}
            >
              <div className="relative row-span-2">
                <Frame label="Foto grande do telão" radius="var(--raio)" />
              </div>
              <div className="relative">
                <Frame label="" radius="var(--raio)" />
              </div>
              <div className="relative">
                <Frame label="" radius="var(--raio)" />
              </div>
            </div>

            <div className="absolute bottom-[var(--espaco)] left-[var(--espaco)] flex items-center gap-3 rounded-pilula bg-superficie-alta px-5 py-[0.6875rem] text-ink">
              <span className="pulso size-1.5 rounded-full bg-acento" />
              <span className="font-titulo text-sm uppercase tracking-rotulo">
                ao vivo · 847 fotos
              </span>
            </div>

            <div className="absolute right-[var(--espaco)] top-[var(--espaco)] font-titulo text-[0.8125rem] uppercase tracking-rotulo text-ink-2">
              {example}
            </div>
          </div>
        </div>

        <div style={toVariables(printTokens) as CSSProperties}>
          <p className="mb-[clamp(0.875rem,2vw,1.25rem)] text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
            E o mesmo desenho sai impresso
          </p>
          <Stationery example={example} />
        </div>
      </div>
    </>
  );
}

/**
 * The v4 mission grid, on the dark card.
 *
 * The card receives dark ground from the same resolver instead of a
 * hand-inverted palette — the same swap the guest sees at 11pm, proven here.
 */
export function Missions({
  missions,
  title,
  highlight,
  lede,
}: {
  missions: { id: string; title: string }[];
  title: string;
  highlight: string;
  lede: string;
}) {
  const [done, setDone] = useState<string[]>([]);
  const dark = resolveTokens({ marca: ALBORA_BRAND, pack: { fundo: "escuro" } });

  const toggle = (id: string) =>
    setDone((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  const ratio = missions.length === 0 ? 0 : done.length / missions.length;

  return (
    <div
      className="rounded-superficie bg-bg p-[clamp(2rem,5vw,4.5rem)_clamp(1.5rem,4vw,3.75rem)] text-ink"
      style={toVariables(dark) as CSSProperties}
    >
      <div className="mb-[clamp(1.25rem,3vw,1.875rem)] flex flex-wrap items-end justify-between gap-6">
        <Heading size="clamp(1.75rem, 4.2vw, 3.25rem)" className="max-w-[20ch]">
          {title} <Accent>{highlight}</Accent>
        </Heading>
        <p className="m-0 max-w-[20rem] leading-normal text-ink-2">
          {lede} Toque numa para ver como o convidado marca.
        </p>
      </div>

      <div className="mb-[1.375rem] flex items-center gap-4">
        <div className="h-[0.1875rem] flex-1 overflow-hidden rounded-pilula bg-linha">
          <div
            className="h-full rounded-pilula bg-acento"
            style={{
              width: `${Math.round(ratio * 100)}%`,
              ...transition("width", "var(--tempo-lento)"),
            }}
          />
        </div>
        <span className="whitespace-nowrap text-ink-2">
          {done.length} de {missions.length}
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(14.375rem,1fr))] gap-[0.875rem]">
        {missions.map((mission, i) => {
          const complete = done.includes(mission.id);

          return (
            <button
              key={mission.id}
              type="button"
              onClick={() => toggle(mission.id)}
              aria-pressed={complete}
              className={cn(
                "flex min-h-[10.75rem] cursor-pointer flex-col justify-between gap-[1.375rem] rounded-superficie border-0 p-6 text-left font-corpo text-ink shadow-suave",
                complete ? "bg-superficie-alta" : "bg-superficie",
              )}
              style={transition("background", "var(--tempo)")}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-rotulo text-acento">
                  MISSÃO {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "grid size-[1.625rem] place-items-center rounded-full border text-[0.8125rem]",
                    complete
                      ? "border-acento bg-acento text-sobre-acento"
                      : "border-linha bg-transparent",
                  )}
                  style={transition("all", "var(--tempo)")}
                >
                  {complete ? "✓" : ""}
                </span>
              </span>
              <span
                className="font-titulo text-[1.3125rem] font-light leading-[1.22] tracking-titulo"
                style={{
                  opacity: complete ? 0.45 : 1,
                  ...transition("opacity", "var(--tempo)"),
                }}
              >
                {mission.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Enters when it comes into view, once.
 *
 * Three decisions that are not style:
 *
 * - **Starts visible and JS hides.** The opposite would leave the whole page
 *   blank for anyone with JS off or slow, and spec 013 check 2 is exactly
 *   that the page works without JS. Anyone who does not hydrate sees everything.
 * - **Disconnects on reveal.** A live observer after it has done its job is
 *   per-frame work nobody sees, on a page that already has a 300vh demo
 *   listening to scroll.
 * - **Honors `prefers-reduced-motion` in JS itself.** The CSS rule zeroes the
 *   transition, but the element would still start at `opacity: 0` until the
 *   observer fires — and on an old Android that is a blink. Here it never
 *   starts hidden.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = target.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setVisible(false);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={target}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(1.25rem)",
        transitionProperty: "opacity, transform",
        transitionDuration: "var(--tempo-lento)",
        transitionTimingFunction: "var(--curva)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
