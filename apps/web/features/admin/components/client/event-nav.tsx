"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useModerationCount } from "./moderation-count-context";

type Section = { label: string; suffix: string };

const GROUPS: Section[][] = [
  [
    { label: "Ao vivo", suffix: "" },
    { label: "Moderação", suffix: "/moderation" },
  ],
  [
    { label: "Convidados", suffix: "/guests" },
    { label: "Álbum", suffix: "/album" },
    { label: "Insights", suffix: "/insights" },
  ],
  [
    { label: "Missões", suffix: "/missions" },
    { label: "Identidade", suffix: "/identity" },
    { label: "Recado", suffix: "/guestbook" },
    { label: "QR Code", suffix: "/qrcode" },
  ],
];

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = `/admin/e/${eventId}`;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <nav
      className="relative mb-6"
      aria-label="Seções do evento"
    >
      {canScrollLeft && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 bottom-0 z-[1] w-8 bg-gradient-to-r from-bg to-transparent"
        />
      )}
      {canScrollRight && (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 bottom-0 z-[1] w-8 bg-gradient-to-l from-bg to-transparent"
        />
      )}
      <div
        ref={scrollRef}
        className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex items-center gap-1.5 pb-px">
          {GROUPS.map((group, gi) => (
            <Fragment key={gi}>
              {gi > 0 && (
                <span
                  aria-hidden
                  className="h-5 w-px shrink-0 self-center bg-linha"
                />
              )}
              {group.map(({ label, suffix }) => {
                const href = `${base}${suffix}`;
                const active =
                  suffix === ""
                    ? pathname === base || pathname === `${base}/`
                    : pathname.startsWith(href);
                const badge = suffix === "/moderation" && count > 0;

                return (
                  <Link
                    key={href}
                    href={href}
                    className={[
                      "relative shrink-0 rounded-pilula px-3.5 py-1.5 font-titulo text-sm no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
                      active
                        ? "bg-acento text-sobre-acento"
                        : "border border-linha bg-superficie text-ink hover:bg-superficie-alta",
                    ].join(" ")}
                  >
                    {label}
                    {badge && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critico px-1 font-titulo text-[0.55rem] leading-none text-sobre-acento">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </nav>
  );
}
