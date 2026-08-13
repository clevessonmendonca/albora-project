"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { raio } from "../../../landing/pecas";

const SECOES = [
  { rotulo: "Ao vivo", sufixo: "" },
  { rotulo: "O álbum", sufixo: "/album" },
  { rotulo: "Identidade", sufixo: "/identidade" },
] as const;

type Props = {
  eventoId: string;
};

export function NavEvento({ eventoId }: Props) {
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
      {SECOES.map(({ rotulo, sufixo }) => {
        const href = `${base}${sufixo}`;
        const ativa =
          sufixo === ""
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
              color: ativa ? "var(--sobre-acento)" : "var(--ink)",
              backgroundColor: ativa ? "var(--acento)" : "var(--superficie)",
              border: ativa ? "none" : "1px solid var(--linha)",
              ...raio("var(--raio-pilula)"),
            }}
          >
            {rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
