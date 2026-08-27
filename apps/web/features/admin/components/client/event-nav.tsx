"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { label: "Ao vivo", suffix: "" },
  { label: "Insights", suffix: "/insights" },
  { label: "Convidados", suffix: "/guests" },
  { label: "Moderação", suffix: "/moderation" },
  { label: "Álbum", suffix: "/album" },
  { label: "Missões", suffix: "/missions" },
  { label: "Identidade", suffix: "/identity" },
  { label: "Recado", suffix: "/guestbook" },
  { label: "QR Code", suffix: "/qrcode" },
] as const;

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;

  return (
    <nav
      className="mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Seções do evento"
    >
      <div className="flex gap-1.5 pb-px">
        {SECTIONS.map(({ label, suffix }) => {
          const href = `${base}${suffix}`;
          const active =
            suffix === ""
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={[
                "shrink-0 rounded-pilula px-3.5 py-1.5 font-titulo text-sm no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
                active
                  ? "bg-acento text-sobre-acento"
                  : "border border-linha bg-superficie text-ink hover:bg-superficie-alta",
              ].join(" ")}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
