import { StackIcon } from "./icons";
import { NavCameraButton } from "./nav-camera-button";
import { SHARED_GUEST_TABS } from "./nav-tabs";

export type GuestTab = "feed" | "missoes" | "album" | "minhas";

const TAB_FEED = {
  id: "feed" as const,
  label: "Feed",
  column: "col-start-1",
  icon: <StackIcon />,
};

const TABS = [TAB_FEED, ...SHARED_GUEST_TABS];

export function TabBar({ active }: { active: GuestTab }) {
  return (
    <div role="presentation" className="relative grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[1.625rem]">
      {TABS.map((tab) => {
        const isActive = tab.id === active;

        return (
          <span
            key={tab.id}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 flex-col items-center justify-center gap-1 text-[0.5625rem] uppercase tracking-rotulo transition-colors duration-[var(--tempo)] ease-mola ${tab.column} ${
              isActive ? "text-acento-texto" : "text-ink-3"
            }`}
          >
            {tab.icon}
            {tab.label}
          </span>
        );
      })}

      <NavCameraButton />
    </div>
  );
}
