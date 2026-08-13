"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { label: "Ao vivo", suffix: "" },
  { label: "Convidados", suffix: "/guests" },
  { label: "Moderação", suffix: "/moderation" },
  { label: "O álbum", suffix: "/album" },
  { label: "Identidade", suffix: "/identity" },
] as const;

export function EventNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;

  return (
    <nav className="mb-6 flex flex-wrap gap-2" aria-label="Seções do evento">
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
              "rounded-pilula px-4 py-2 font-titulo text-sm no-underline",
              active
                ? "bg-acento text-sobre-acento"
                : "border border-linha bg-superficie text-ink",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
