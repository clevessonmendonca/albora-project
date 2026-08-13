"use client";

import Link from "next/link";
import {
  CameraIcon,
  GridIcon,
  PersonIcon,
  StackIcon,
  Star,
  type GuestTab,
} from "@albora/ui-web";

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

export function GuestTabBar({ slug, active }: { slug: string; active?: GuestTab }) {
  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[5] grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[calc(1.625rem+env(safe-area-inset-bottom))]">
      <TabLink column={1} href={`${base}/feed`} active={active === "feed"} label="Feed" icon={<StackIcon />} />
      <TabLink
        column={2}
        href={`${base}/missions`}
        active={active === "missoes"}
        label="Missões"
        icon={<Star size={22} />}
      />
      <Link
        href={`${base}/photo`}
        aria-label="Mandar foto ou vídeo"
        className="col-start-3 -mt-5 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento no-underline shadow-acento"
      >
        <CameraIcon />
      </Link>
      <TabLink column={4} href={`${base}/album`} active={active === "album"} label="Álbum" icon={<GridIcon />} />
      <TabLink column={5} href={`${base}/my-photos`} active={active === "minhas"} label="Minhas" icon={<PersonIcon />} />
    </nav>
  );
}
