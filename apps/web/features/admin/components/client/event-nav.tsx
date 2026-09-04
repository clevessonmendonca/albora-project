"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useModerationCount } from "./moderation-count-context";

type Section = { label: string; suffix: string };

const GROUPS: Section[][] = [
  [
    { label: "Ao vivo", suffix: "" },
    { label: "Pré-evento", suffix: "/pre-event" },
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
    { label: "Consentimento", suffix: "/consent" },
  ],
];

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = `/admin/e/${eventId}`;

  return (
    <nav
      data-admin-nav
      className="mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Seções do evento"
    >
      <div className="flex items-center gap-2 pb-px">
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
                  aria-current={active ? "page" : undefined}
                  className={[
                    "relative shrink-0 rounded-pilula px-3.5 py-1.5 font-titulo text-sm no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)] min-h-11 inline-flex items-center",
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
    </nav>
  );
}
