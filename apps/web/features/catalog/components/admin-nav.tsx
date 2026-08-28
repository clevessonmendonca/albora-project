import { GridIcon, MoreIcon, PersonIcon, StackIcon } from "@albora/ui-web";
import { SignalIcon } from "./signal-icon";

export type AdminSection = "live" | "wall" | "moderation" | "guests" | "more";

export function AdminNav({ active }: { active: AdminSection }) {
  const tabs = [
    { id: "live", label: "Ao vivo", icon: <StackIcon /> },
    { id: "wall", label: "Parede", icon: <GridIcon /> },
    { id: "moderation", label: "Fila", icon: <SignalIcon /> },
    { id: "guests", label: "Convidados", icon: <PersonIcon /> },
    { id: "more", label: "Mais", icon: <MoreIcon size={22} /> },
  ] as const;

  return (
    <nav className="flex items-center justify-around border-t border-linha bg-bg px-2 pt-2.5 pb-[1.625rem]">
      {tabs.map((tab) => (
        <span
          key={tab.id}
          className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo ${
            tab.id === active ? "text-acento" : "text-ink-3"
          }`}
        >
          {tab.icon}
          {tab.label}
        </span>
      ))}
    </nav>
  );
}
