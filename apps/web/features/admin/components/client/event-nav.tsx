"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { raio } from "@/app/landing/pecas";

const SECTIONS = [
  { label: "Ao vivo", suffix: "" },
  { label: "Convidados", suffix: "/convidados" },
  { label: "Moderação", suffix: "/moderacao" },
  { label: "O álbum", suffix: "/album" },
  { label: "Identidade", suffix: "/identidade" },
] as const;

export function EventNav({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  const base = `/admin/e/${eventoId}`;

  return (
    <nav
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "0.5rem",
        marginBottom: "1.5rem",
      }}
      aria-label="Seções do evento"
    >
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
            style={{
              padding: "0.5rem 1rem",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.875rem",
              textDecoration: "none",
              color: active ? "var(--sobre-acento)" : "var(--ink)",
              backgroundColor: active ? "var(--acento)" : "var(--superficie)",
              border: active ? "none" : "1px solid var(--linha)",
              ...raio("var(--raio-pilula)"),
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
