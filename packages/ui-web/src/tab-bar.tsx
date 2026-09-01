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
      {TABS.map((tab) => (
        <span
          key={tab.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${tab.column} ${
            tab.id === active ? "text-acento" : "text-ink-3"
          }`}
        >
          {tab.icon}
          {tab.label}
        </span>
      ))}

      <NavCameraButton />
    </div>
  );
}
