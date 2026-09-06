"use client";

import { cn } from "@albora/ui-web";
import type { FilterMission } from "../../hooks/use-feed-filter";

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
      className="mx-[calc(var(--espaco)*-5)] mb-[calc(var(--espaco)*5)] mt-[calc(var(--espaco)*3)] flex gap-2 overflow-x-auto px-[calc(var(--espaco)*5)] py-1 [scrollbar-width:none]"
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "max-w-56 min-h-11 flex-none cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-pilula border px-4 font-titulo text-[0.68rem] font-normal uppercase tracking-[0.2em]",
        "transition-[background-color,border-color,color,transform] duration-instantaneo ease-mola active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        active
          ? "border-acento bg-acento-superficie text-acento-texto"
          : "border-linha bg-superficie text-ink-3 hover:border-acento-borda hover:text-ink-2",
      )}
    >
      {children}
    </button>
  );
}
