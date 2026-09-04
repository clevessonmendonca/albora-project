import type { ElementType, ReactNode } from "react";
import { StackIcon } from "./icons";
import { NavCameraButton } from "./nav-camera-button";
import { SHARED_GUEST_TABS } from "./nav-tabs";
import { cn } from "./variants";

export type FloatingNavTab = "inicio" | "missoes" | "album" | "minhas";

export type FloatingNavProps = {
  /** Ausente quando a tela não corresponde a nenhum slot — realçar o mais próximo enganaria o convidado. */
  active?: FloatingNavTab;
  base: string;
  linkComponent?: ElementType;
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

const TABS: readonly TabDef[] = [TAB_INICIO, ...SHARED_GUEST_TABS];

function FloatingNavItem({
  tab,
  base,
  active,
  linkComponent,
}: {
  tab: TabDef;
  base: string;
  active: FloatingNavTab | undefined;
  linkComponent: ElementType;
}) {
  const isActive = active === tab.id;
  const L = linkComponent;

  return (
    <L
      href={`${base}${tab.path}`}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-[3.375rem] flex-col items-center justify-center gap-1 text-[0.5625rem] uppercase tracking-rotulo no-underline transition-[color,opacity] duration-[var(--tempo)] ease-mola hover:opacity-75",
        tab.column,
        isActive ? "text-acento-texto" : "text-ink-3",
      )}
    >
      {tab.icon}
      {tab.label}
    </L>
  );
}

export function FloatingNav({ active, base, linkComponent }: FloatingNavProps) {
  const L = linkComponent ?? "a";

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-4 z-40 grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center rounded-pilula border border-linha bg-superficie-alta px-2 py-2"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      {TABS.map((tab) => (
        <FloatingNavItem key={tab.id} tab={tab} base={base} active={active} linkComponent={L} />
      ))}

      <NavCameraButton href={`${base}/photo`} linkComponent={L} lift="-mt-6" />
    </nav>
  );
}
