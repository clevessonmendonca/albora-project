import Link from "next/link";
import type { ReactNode } from "react";
import { CameraIcon, GridIcon, PersonIcon, StackIcon } from "./icons";
import { Star } from "./star";
import { cn } from "./variants";

export type FloatingNavTab = "inicio" | "missoes" | "album" | "minhas";

export type FloatingNavProps = {
  active: FloatingNavTab;
  base: string;
};

type TabDef = {
  id: FloatingNavTab;
  label: string;
  icon: ReactNode;
  path: string;
  column: string;
};

const TAB_INICIO: TabDef = {
  id: "inicio",
  label: "Início",
  icon: <StackIcon size={22} />,
  path: "",
  column: "col-start-1",
};

const TAB_MISSOES: TabDef = {
  id: "missoes",
  label: "Missões",
  icon: <Star size={22} />,
  path: "/missions",
  column: "col-start-2",
};

const TAB_ALBUM: TabDef = {
  id: "album",
  label: "Álbum",
  icon: <GridIcon size={22} />,
  path: "/album",
  column: "col-start-4",
};

const TAB_MINHAS: TabDef = {
  id: "minhas",
  label: "Minhas",
  icon: <PersonIcon size={22} />,
  path: "/my-photos",
  column: "col-start-5",
};

function FloatingNavItem({ tab, base, active }: { tab: TabDef; base: string; active: FloatingNavTab }) {
  const isActive = active === tab.id;

  return (
    <Link
      href={`${base}${tab.path}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-[3.375rem] flex-col items-center justify-center gap-1 text-[0.5625rem] uppercase tracking-rotulo no-underline",
        tab.column,
        isActive ? "text-acento" : "text-ink-3",
      )}
    >
      {tab.icon}
      {tab.label}
    </Link>
  );
}

export function FloatingNav({ active, base }: FloatingNavProps) {
  return (
    <nav
      className="fixed inset-x-4 z-40 grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center rounded-pilula border border-linha bg-superficie-alta px-2 py-2"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <FloatingNavItem tab={TAB_INICIO} base={base} active={active} />
      <FloatingNavItem tab={TAB_MISSOES} base={base} active={active} />

      <Link
        href={`${base}/photo`}
        aria-label="Mandar foto ou vídeo"
        className="col-start-3 -mt-6 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento no-underline shadow-acento"
      >
        <CameraIcon />
      </Link>

      <FloatingNavItem tab={TAB_ALBUM} base={base} active={active} />
      <FloatingNavItem tab={TAB_MINHAS} base={base} active={active} />
    </nav>
  );
}
