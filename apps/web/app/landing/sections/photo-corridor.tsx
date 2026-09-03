"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@albora/ui-web";
import { Accent, Heading, Label, radiusStyle, transition } from "../pieces";
import { SIDE_PADDING } from "../landing-data";

const CORRIDOR_CARDS = [
  { src: "/landing/dancefloor.webp", badge: "Pista de dança", stats: "127 fotos" },
  { src: "/landing/guest.webp", badge: "Brinde", stats: "84 fotos" },
  { src: "/landing/album.webp", badge: "Cerimônia", stats: "203 fotos" },
  { src: "/landing/hero.webp", badge: "Bolo", stats: "56 fotos" },
  { src: "/landing/dancefloor.webp", badge: "Buquê", stats: "31 fotos" },
  { src: "/landing/guest.webp", badge: "Entrada", stats: "92 fotos" },
  { src: "/landing/album.webp", badge: "Primeira dança", stats: "48 fotos" },
  { src: "/landing/hero.webp", badge: "Mesa do bolo", stats: "67 fotos" },
  { src: "/landing/dancefloor.webp", badge: "Pôr do sol", stats: "39 fotos" },
] as const;

const GAP = 260;
const DEPTH = 280;
const ANGLE = 38;
const CARD_W = 220;
const CARD_H = 340;

function useCorridorScroll(trackRef: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);
  const pending = useRef(0);

  useEffect(() => {
    const target = trackRef.current;
    if (!target) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const measure = () => {
      pending.current = 0;
      const box = target.getBoundingClientRect();
      const course = box.height - window.innerHeight;
      if (course <= 0) return;
      const p = Math.min(1, Math.max(0, -box.top / course));
      setProgress(p);
    };

    const onScroll = () => {
      if (pending.current === 0) pending.current = requestAnimationFrame(measure);
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
      if (pending.current !== 0) cancelAnimationFrame(pending.current);
    };
  }, [trackRef]);

  return progress;
}

function CorridorCard({
  card,
  offset,
}: {
  card: (typeof CORRIDOR_CARDS)[number];
  offset: number;
}) {
  const x = offset * GAP;
  const z = -Math.abs(offset) * DEPTH;
  const ry = -offset * ANGLE * 0.35;
  const scale = 1 - Math.min(Math.abs(offset) * 0.12, 0.5);
  const opacity = Math.abs(offset) > 3 ? 0 : 1;
  const zIndex = 100 - Math.round(Math.abs(offset) * 10);

  return (
    <article
      className="absolute left-1/2 top-1/2 overflow-hidden bg-superficie shadow-alta"
      style={{
        width: CARD_W,
        height: CARD_H,
        marginLeft: -CARD_W / 2,
        marginTop: -CARD_H / 2,
        transform: `translate3d(${x}px, 0, ${z}px) rotateY(${ry}deg) scale(${scale})`,
        opacity,
        zIndex,
        willChange: "transform, opacity",
        ...radiusStyle("var(--raio-superficie)"),
      }}
    >
      <Image
        src={card.src}
        alt={card.badge}
        fill
        sizes="220px"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10">
        <span
          className="rounded-pilula bg-acento px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-rotulo text-sobre-acento"
        >
          {card.badge}
        </span>
        <span className="text-[0.75rem] text-white/80">{card.stats}</span>
      </div>
    </article>
  );
}

function CorridorNav({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="absolute bottom-[clamp(1.5rem,3vw,2.5rem)] right-[clamp(1.5rem,4vw,3rem)] flex items-center gap-4">
      <span className="font-titulo text-[clamp(2rem,5vw,3.5rem)] font-light tabular-nums text-ink">
        {String(current + 1).padStart(2, "0")}
      </span>
      <span className="text-sm text-ink-3">de {total}</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          aria-label="Foto anterior"
          className="grid size-10 cursor-pointer place-items-center rounded-full border border-linha bg-transparent text-ink"
          style={transition("all")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 2L4 7L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Próxima foto"
          className="grid size-10 cursor-pointer place-items-center rounded-full border border-linha bg-transparent text-ink"
          style={transition("all")}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M5 2L10 7L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function PhotoCorridorSection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const progress = useCorridorScroll(trackRef);
  const [manualOffset, setManualOffset] = useState(0);
  const isManual = useRef(false);
  const manualTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const total = CORRIDOR_CARDS.length;
  const scrollFocus = progress * (total - 1);
  const focus = isManual.current ? manualOffset : scrollFocus;
  const currentIdx = Math.min(total - 1, Math.max(0, Math.round(focus)));

  const exitProgress = Math.min(1, Math.max(0, (progress - 0.85) / 0.15));
  const entryProgress = Math.min(1, progress / 0.15);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      isManual.current = true;
      setManualOffset((prev) => {
        const next = Math.min(total - 1, Math.max(0, Math.round(prev) + dir));
        return next;
      });
      clearTimeout(manualTimer.current);
      manualTimer.current = setTimeout(() => {
        isManual.current = false;
      }, 2000);
    },
    [total],
  );

  useEffect(() => {
    if (!isManual.current) setManualOffset(scrollFocus);
  }, [scrollFocus]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  return (
    <div ref={trackRef} className={reducedMotion ? "relative" : "relative h-[500vh]"}>
      <div
        className={cn(
          "overflow-hidden bg-superficie-alta",
          reducedMotion
            ? "relative rounded-superficie"
            : "sticky top-0 h-screen",
        )}
      >
        <div
          className={cn("absolute left-0 top-0 z-10", SIDE_PADDING)}
          style={{
            paddingTop: "clamp(1.5rem, 4vw, 3rem)",
            opacity: 1 - exitProgress,
            transform: `translateY(${-exitProgress * 20}px)`,
          }}
        >
          <Label>Fotos de festas reais</Label>
          <Heading size="clamp(1.75rem, 4.4vw, 3.25rem)">
            Fotos que os convidados fizeram.{" "}
            <Accent>Nenhuma precisou de fotógrafo.</Accent>
          </Heading>
        </div>

        <div
          className={cn(
            "absolute left-0 top-0 z-10 flex flex-col gap-6",
            SIDE_PADDING,
          )}
          style={{
            paddingTop: "clamp(1.5rem, 4vw, 3rem)",
            opacity: exitProgress,
            transform: `translateY(${(1 - exitProgress) * 20}px)`,
            pointerEvents: exitProgress > 0.5 ? "auto" : "none",
          }}
        >
          <Heading size="clamp(1.75rem, 4.4vw, 3.25rem)">
            E o próximo álbum{" "}
            <Accent>é o seu.</Accent>
          </Heading>
          <a
            href="/admin/new?plano=free"
            className="pilula inline-flex w-fit items-center justify-center whitespace-nowrap rounded-pilula bg-ink px-8 py-4 font-medium text-bg no-underline"
          >
            Criar meu álbum grátis
          </a>
        </div>

        <div
          className="absolute right-[clamp(1.5rem,4vw,3rem)] top-[clamp(1.5rem,4vw,3rem)] z-10 flex gap-[clamp(1.5rem,3vw,3rem)]"
          style={{ opacity: entryProgress }}
        >
          <div className="text-right">
            <p className="m-0 font-titulo text-[clamp(1.5rem,4vw,3rem)] font-light text-ink">
              {total}
            </p>
            <p className="m-0 text-[0.75rem] text-ink-3">
              momentos<br />capturados
            </p>
          </div>
          <div className="text-right">
            <p className="m-0 font-titulo text-[clamp(1.5rem,4vw,3rem)] font-light text-ink">
              0
            </p>
            <p className="m-0 text-[0.75rem] text-ink-3">
              fotógrafos<br />contratados
            </p>
          </div>
        </div>

        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            perspective: "1300px",
            transformStyle: "preserve-3d",
          }}
        >
          <div
            className="relative"
            style={{
              width: CARD_W,
              height: CARD_H,
              transformStyle: "preserve-3d",
            }}
          >
            {CORRIDOR_CARDS.map((card, i) => (
              <CorridorCard key={i} card={card} offset={i - focus} />
            ))}
          </div>
        </div>

        <CorridorNav
          current={currentIdx}
          total={total}
          onPrev={() => navigate(-1)}
          onNext={() => navigate(1)}
        />

        <ul className="sr-only" aria-label="Fotos de festas reais">
          {CORRIDOR_CARDS.map((card, i) => (
            <li key={i}>
              {card.badge}: {card.stats}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
