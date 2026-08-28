"use client";

import { cn } from "@albora/ui-web";
import type { FilterMission } from "../hooks/use-feed-filter";

type FeedFilterPanelProps = {
  label: string;
  missions: FilterMission[];
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function FeedFilterPanel({
  label,
  missions,
  selected,
  onSelect,
}: FeedFilterPanelProps) {
  const handleToggle = (id: string) => {
    onSelect(id === selected ? null : id);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*5)] mt-[calc(var(--espaco)*3)] flex gap-[calc(var(--espaco)*6)] overflow-x-auto border-b border-linha px-[calc(var(--espaco)*5)] py-3 [scrollbar-width:none]"
    >
      <FilterTab active={selected === null} onClick={() => onSelect(null)}>
        Tudo
      </FilterTab>

      {missions.map((m) => (
        <FilterTab
          key={m.id}
          active={selected === m.id}
          onClick={() => handleToggle(m.id)}
        >
          {m.title}
        </FilterTab>
      ))}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "max-w-56 min-h-12 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap border-none bg-transparent p-0 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "[transition:color_var(--tempo-rapido)_var(--curva)]",
        active
          ? "border-b border-b-acento text-ink"
          : "border-b border-b-transparent text-ink-3 hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}
