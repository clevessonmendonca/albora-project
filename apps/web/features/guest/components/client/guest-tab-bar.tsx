"use client";

import Link from "next/link";
import {
  Estrela,
  IconeCamera,
  IconeGrade,
  IconePessoa,
  IconePilha,
} from "@albora/ui-web";

type GuestTab = "feed" | "album" | "missoes" | "minhas";

function TabLink({
  href,
  active,
  label,
  icon,
  column,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  column: number;
}) {
  return (
    <Link
      href={href}
      style={{ gridColumn: column }}
      className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo no-underline ${
        active ? "text-acento" : "text-ink-3"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Navegação do convidado — Feed · Missões · câmera · Álbum · Minhas.
 * Música fica fora da barra até virar card na capa.
 */
export function GuestTabBar({ slug, ativa }: { slug: string; ativa?: GuestTab }) {
  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[5] grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[calc(1.625rem+env(safe-area-inset-bottom))]">
      <TabLink
        column={1}
        href={`${base}/feed`}
        active={ativa === "feed"}
        label="Feed"
        icon={<IconePilha />}
      />
      <TabLink
        column={2}
        href={`${base}/missoes`}
        active={ativa === "missoes"}
        label="Missões"
        icon={<Estrela tamanho={22} />}
      />

      <Link
        href={`${base}/foto`}
        aria-label="Mandar foto ou vídeo"
        className="col-start-3 -mt-5 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento no-underline shadow-acento"
      >
        <IconeCamera />
      </Link>

      <TabLink
        column={4}
        href={`${base}/album`}
        active={ativa === "album"}
        label="Álbum"
        icon={<IconeGrade />}
      />
      <TabLink
        column={5}
        href={`${base}/minhas`}
        active={ativa === "minhas"}
        label="Minhas"
        icon={<IconePessoa />}
      />
    </nav>
  );
}

export const BarraDeAbasConvidado = GuestTabBar;
export const BarraDeAbas = GuestTabBar;
