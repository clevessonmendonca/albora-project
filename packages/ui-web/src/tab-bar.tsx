import { Star } from "./star";
import { CameraIcon, GridIcon, PersonIcon, StackIcon } from "./icons";

export type GuestTab = "feed" | "missoes" | "album" | "minhas";

const TABS = [
  { id: "feed", label: "Feed", icon: <StackIcon /> },
  { id: "missoes", label: "Missões", icon: <Star size={22} /> },
  { id: "album", label: "Álbum", icon: <GridIcon /> },
  { id: "minhas", label: "Minhas", icon: <PersonIcon /> },
] as const;

const TAB_COLUMNS = ["col-start-1", "col-start-2", "col-start-4", "col-start-5"] as const;

export function TabBar({ active }: { active: GuestTab }) {
  return (
    <nav className="relative grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[1.625rem]">
      {TABS.map((tab, i) => (
        <span
          key={tab.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${TAB_COLUMNS[i]} ${
            tab.id === active ? "text-acento" : "text-ink-3"
          }`}
        >
          {tab.icon}
          {tab.label}
        </span>
      ))}

      <span className="col-start-3 -mt-5 grid size-[3.375rem] place-items-center justify-self-center rounded-full bg-acento text-sobre-acento shadow-acento">
        <CameraIcon />
      </span>
    </nav>
  );
}
